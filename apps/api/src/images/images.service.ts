import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common'
import sharp from 'sharp'
import { createHash, randomUUID } from 'crypto'
import { eq, desc, asc } from 'drizzle-orm'
import { DbService } from '../db/db.service'
import { StorageService } from '../storage/storage.service'
import { productImages, products } from '@trendmarga/db'
import {
  IMAGE_VARIANTS,
  IMAGE_VARIANT_NAMES,
  ALLOWED_UPLOAD_MIME,
  type AllowedUploadMime,
} from '@trendmarga/config'

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024

interface PresignInput {
  productId: string
  contentType: string
  size: number
}

interface FinalizeInput {
  productId: string
  /** The temp key the browser uploaded to (returned from presign). */
  tempKey: string
  alt?: string
  isPrimary?: boolean
}

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name)
  private readonly maxBytes: number

  constructor(
    private readonly db: DbService,
    private readonly storage: StorageService,
  ) {
    this.maxBytes = Number(process.env.IMAGE_MAX_BYTES) || DEFAULT_MAX_BYTES
  }

  /** Step 1: client requests a presigned PUT URL. */
  async presign(input: PresignInput) {
    if (!ALLOWED_UPLOAD_MIME.includes(input.contentType as AllowedUploadMime)) {
      throw new BadRequestException(`Unsupported content-type. Allowed: ${ALLOWED_UPLOAD_MIME.join(', ')}`)
    }
    if (!input.size || input.size <= 0) throw new BadRequestException('Invalid size')
    if (input.size > this.maxBytes) {
      throw new PayloadTooLargeException(`Image too large (${input.size} bytes). Max ${this.maxBytes} bytes.`)
    }
    const product = await this.db.client.query.products.findFirst({
      where: eq(products.id, input.productId),
      columns: { id: true },
    })
    if (!product) throw new NotFoundException('Product not found')

    const tempKey = `tmp/${input.productId}/${randomUUID()}`
    const presigned = await this.storage.presignPut(tempKey, input.contentType, input.size)
    return { ...presigned, maxBytes: this.maxBytes }
  }

  /**
   * Step 2: after upload completes, the client calls finalize.
   * We fetch the original, run sharp, write all variants to content-addressed
   * keys, then insert a product_images row and delete the tmp key.
   */
  async finalize(input: FinalizeInput) {
    const product = await this.db.client.query.products.findFirst({
      where: eq(products.id, input.productId),
      columns: { id: true, name: true },
    })
    if (!product) throw new NotFoundException('Product not found')

    let original: Buffer
    try {
      original = await this.storage.getObject(input.tempKey)
    } catch (e: any) {
      this.logger.error(`finalize: failed to read tmp ${input.tempKey}: ${e?.message}`)
      throw new BadRequestException('Upload not found in storage. Re-upload required.')
    }
    if (original.length > this.maxBytes) {
      await this.storage.deleteObject(input.tempKey)
      throw new PayloadTooLargeException('Image exceeds maximum size')
    }

    // sharp pipeline: rotate by EXIF then strip metadata
    const pipeline = sharp(original, { failOn: 'truncated' }).rotate()
    const meta = await pipeline.metadata()
    if (!meta.width || !meta.height || !meta.format) {
      await this.storage.deleteObject(input.tempKey)
      throw new BadRequestException('Could not decode image')
    }
    if (!['jpeg', 'png', 'webp'].includes(meta.format)) {
      await this.storage.deleteObject(input.tempKey)
      throw new BadRequestException(`Unsupported image format: ${meta.format}`)
    }

    // Content-addressed hash directory keeps re-uploads idempotent.
    const hash = createHash('sha256').update(original).digest('hex').slice(0, 12)

    // Encode original as webp at high quality (canonical original we keep around).
    const originalBuf = await pipeline.clone().webp({ quality: 92 }).toBuffer()
    const originalKey = this.storage.buildKey(product.id, hash, 'original.webp')
    await this.storage.putObject(originalKey, originalBuf, 'image/webp')

    // Generate each variant in parallel.
    await Promise.all(
      IMAGE_VARIANT_NAMES.map(async (variant: string) => {
        const spec = IMAGE_VARIANTS[variant as keyof typeof IMAGE_VARIANTS]
        const buf = await sharp(original)
          .rotate()
          .resize({ width: spec.width, height: spec.height, fit: spec.fit as any, withoutEnlargement: false })
          .webp({ quality: spec.quality })
          .toBuffer()
        const key = this.storage.buildKey(product.id, hash, `${variant}.webp`)
        await this.storage.putObject(key, buf, 'image/webp')
      }),
    )

    // Blur placeholder (tiny base64).
    const blurBuf = await sharp(original).rotate().resize(10).blur(2).webp({ quality: 20 }).toBuffer()
    const blurDataUrl = `data:image/webp;base64,${blurBuf.toString('base64')}`

    // Clean up tmp.
    await this.storage.deleteObject(input.tempKey)

    // Determine sortOrder + isPrimary.
    const existing = await this.db.client
      .select({ sortOrder: productImages.sortOrder, isPrimary: productImages.isPrimary })
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(desc(productImages.sortOrder))
    const nextOrder = existing.length === 0 ? 0 : (existing[0].sortOrder ?? 0) + 1
    const hasPrimary = existing.some((r) => r.isPrimary)
    const makePrimary = input.isPrimary === true || !hasPrimary

    // If we're making this primary, clear any existing primary.
    if (makePrimary && hasPrimary) {
      await this.db.client
        .update(productImages)
        .set({ isPrimary: false })
        .where(eq(productImages.productId, product.id))
    }

    const [row] = await this.db.client
      .insert(productImages)
      .values({
        productId: product.id,
        source: 'upload',
        storageKey: originalKey,
        width: meta.width,
        height: meta.height,
        format: meta.format,
        byteSize: original.length,
        blurDataUrl,
        alt: input.alt?.slice(0, 255) ?? product.name,
        sortOrder: nextOrder,
        isPrimary: makePrimary,
      })
      .returning()

    return this.shapeRow(row)
  }

  async listForProduct(productId: string) {
    const rows = await this.db.client
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.sortOrder))
    return rows.map((r) => this.shapeRow(r))
  }

  async delete(id: string) {
    const [row] = await this.db.client.select().from(productImages).where(eq(productImages.id, id))
    if (!row) throw new NotFoundException('Image not found')

    if (row.source === 'upload' && row.storageKey) {
      // Delete every variant + the original (best-effort).
      const dir = row.storageKey.replace(/\/original\.webp$/, '')
      await Promise.all([
        this.storage.deleteObject(row.storageKey),
        ...IMAGE_VARIANT_NAMES.map((v: string) => this.storage.deleteObject(`${dir}/${v}.webp`)),
      ])
    }

    await this.db.client.delete(productImages).where(eq(productImages.id, id))

    // If we deleted the primary, promote the next image (lowest sortOrder).
    if (row.isPrimary) {
      const [next] = await this.db.client
        .select({ id: productImages.id })
        .from(productImages)
        .where(eq(productImages.productId, row.productId))
        .orderBy(asc(productImages.sortOrder))
        .limit(1)
      if (next) {
        await this.db.client
          .update(productImages)
          .set({ isPrimary: true })
          .where(eq(productImages.id, next.id))
      }
    }

    return { ok: true }
  }

  async patch(id: string, body: { alt?: string; sortOrder?: number; isPrimary?: boolean }) {
    const [row] = await this.db.client.select().from(productImages).where(eq(productImages.id, id))
    if (!row) throw new NotFoundException('Image not found')

    if (body.isPrimary === true) {
      // Clear other primaries on the same product first.
      await this.db.client
        .update(productImages)
        .set({ isPrimary: false })
        .where(eq(productImages.productId, row.productId))
    }

    const updates: Record<string, unknown> = {}
    if (typeof body.alt === 'string') updates.alt = body.alt.slice(0, 255)
    if (typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder)) updates.sortOrder = body.sortOrder
    if (typeof body.isPrimary === 'boolean') updates.isPrimary = body.isPrimary

    if (Object.keys(updates).length === 0) return this.shapeRow(row)

    const [updated] = await this.db.client
      .update(productImages)
      .set(updates)
      .where(eq(productImages.id, id))
      .returning()
    return this.shapeRow(updated)
  }

  /**
   * Reorder all images for a product to match the given id sequence.
   * IDs not in the array keep their current sortOrder (appended after).
   */
  async reorder(productId: string, ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) return this.listForProduct(productId)
    const rows = await this.db.client
      .select({ id: productImages.id })
      .from(productImages)
      .where(eq(productImages.productId, productId))
    const valid = new Set(rows.map((r) => r.id))
    let order = 0
    for (const id of ids) {
      if (!valid.has(id)) continue
      await this.db.client.update(productImages).set({ sortOrder: order++ }).where(eq(productImages.id, id))
    }
    return this.listForProduct(productId)
  }

  /**
   * Add an external URL as a product image (legacy / merchant-pasted).
   * No bytes are downloaded — we just record the URL.
   */
  async addExternal(input: { productId: string; url: string; alt?: string }) {
    const product = await this.db.client.query.products.findFirst({
      where: eq(products.id, input.productId),
      columns: { id: true, name: true },
    })
    if (!product) throw new NotFoundException('Product not found')
    if (!/^https?:\/\//i.test(input.url)) throw new BadRequestException('URL must be http(s)')

    const existing = await this.db.client
      .select({ sortOrder: productImages.sortOrder, isPrimary: productImages.isPrimary })
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(desc(productImages.sortOrder))
    const nextOrder = existing.length === 0 ? 0 : (existing[0].sortOrder ?? 0) + 1
    const makePrimary = !existing.some((r) => r.isPrimary)

    const [row] = await this.db.client
      .insert(productImages)
      .values({
        productId: product.id,
        source: 'external',
        externalUrl: input.url,
        alt: input.alt?.slice(0, 255) ?? product.name,
        sortOrder: nextOrder,
        isPrimary: makePrimary,
      })
      .returning()
    return this.shapeRow(row)
  }

  /** Return a public URL for a variant of an image row. */
  variantUrl(
    row: { source: 'upload' | 'external'; storageKey: string | null; externalUrl: string | null },
    variant: 'thumb' | 'grid' | 'detail' | 'zoom' | 'original',
  ): string | null {
    if (row.source === 'external') return row.externalUrl
    if (!row.storageKey) return null
    const dir = row.storageKey.replace(/\/original\.webp$/, '')
    const file = variant === 'original' ? 'original.webp' : `${variant}.webp`
    return this.storage.publicUrl(`${dir}/${file}`)
  }

  private shapeRow(row: typeof productImages.$inferSelect) {
    return {
      id: row.id,
      productId: row.productId,
      source: row.source,
      alt: row.alt,
      width: row.width,
      height: row.height,
      sortOrder: row.sortOrder,
      isPrimary: row.isPrimary,
      blurDataUrl: row.blurDataUrl,
      url: this.variantUrl(row, 'detail'),
      urls: {
        thumb: this.variantUrl(row, 'thumb'),
        grid: this.variantUrl(row, 'grid'),
        detail: this.variantUrl(row, 'detail'),
        zoom: this.variantUrl(row, 'zoom'),
        original: this.variantUrl(row, 'original'),
      },
    }
  }
}
