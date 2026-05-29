import { Injectable } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { products, categories, productImages, productVariants } from '@trendmarga/db'
import { eq, desc, ilike, or, and, asc } from 'drizzle-orm'
import { IMAGE_VARIANTS } from '@trendmarga/config'

type ShapedImage = {
  id: string
  source: 'upload' | 'external'
  alt: string | null
  isPrimary: boolean
  sortOrder: number
  blurDataUrl: string | null
  width: number | null
  height: number | null
  url: string | null
  urls: { thumb: string | null; grid: string | null; detail: string | null; zoom: string | null; original: string | null }
}

function shapeImage(row: typeof productImages.$inferSelect, publicBase: string): ShapedImage {
  if (row.source === 'external') {
    const u = row.externalUrl
    return {
      id: row.id,
      source: 'external',
      alt: row.alt,
      isPrimary: row.isPrimary,
      sortOrder: row.sortOrder,
      blurDataUrl: row.blurDataUrl,
      width: row.width,
      height: row.height,
      url: u,
      urls: { thumb: u, grid: u, detail: u, zoom: u, original: u },
    }
  }
  const dir = (row.storageKey ?? '').replace(/\/original\.webp$/, '')
  const url = (name: string) => (dir ? `${publicBase}/${dir}/${name}` : null)
  return {
    id: row.id,
    source: 'upload',
    alt: row.alt,
    isPrimary: row.isPrimary,
    sortOrder: row.sortOrder,
    blurDataUrl: row.blurDataUrl,
    width: row.width,
    height: row.height,
    url: url('detail.webp'),
    urls: {
      thumb: url('thumb.webp'),
      grid: url('grid.webp'),
      detail: url('detail.webp'),
      zoom: url('zoom.webp'),
      original: url('original.webp'),
    },
  }
}

function publicBaseUrl(): string {
  const r2 = process.env.R2_PUBLIC_URL
  if (r2) return r2.replace(/\/$/, '')
  return (
    process.env.LOCAL_UPLOADS_BASE_URL?.replace(/\/$/, '') ??
    `http://localhost:${process.env.PORT ?? process.env.API_PORT ?? 4000}/uploads`
  )
}

@Injectable()
export class ProductsService {
  constructor(private readonly db: DbService) {}

  private attachImages<
    T extends {
      imageAssets?: (typeof productImages.$inferSelect)[]
      variants?: (typeof productVariants.$inferSelect)[]
    },
  >(product: T): Omit<T, 'imageAssets' | 'variants'> & {
    imageAssets: ShapedImage[]
    variants: (typeof productVariants.$inferSelect)[]
  } {
    const base = publicBaseUrl()
    const sortedImages = [...(product.imageAssets ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
    const sortedVariants = [...(product.variants ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime(),
    )
    return {
      ...product,
      imageAssets: sortedImages.map((r) => shapeImage(r, base)),
      variants: sortedVariants,
    }
  }

  async findAll(opts?: { status?: string; categoryId?: string; search?: string }) {
    const conditions = []
    if (opts?.status) conditions.push(eq(products.status, opts.status as any))
    if (opts?.categoryId) conditions.push(eq(products.categoryId, opts.categoryId))
    if (opts?.search) {
      const term = `%${opts.search.trim()}%`
      const searchExpr = or(ilike(products.name, term), ilike(products.sku, term), ilike(products.description, term))
      if (searchExpr) conditions.push(searchExpr)
    }

    const rows = await this.db.client.query.products.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: { category: true, imageAssets: true, variants: true },
      orderBy: [desc(products.createdAt)],
    })
    return rows.map((r) => this.attachImages(r as any))
  }

  async findOne(id: string) {
    const row = await this.db.client.query.products.findFirst({
      where: eq(products.id, id),
      with: { category: true, imageAssets: true, variants: true },
    })
    return row ? this.attachImages(row as any) : null
  }

  async findBySlug(slug: string) {
    const row = await this.db.client.query.products.findFirst({
      where: eq(products.slug, slug),
      with: { category: true, imageAssets: true, variants: true },
    })
    return row ? this.attachImages(row as any) : null
  }

  async create(data: typeof products.$inferInsert) {
    const [product] = await this.db.client.insert(products).values(data).returning()
    return product
  }

  async update(id: string, data: Partial<typeof products.$inferInsert>) {
    const [product] = await this.db.client
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning()
    return product
  }

  async remove(id: string) {
    await this.db.client.delete(products).where(eq(products.id, id))
  }

  // ── Variants ────────────────────────────────────────────────────────────
  async listVariants(productId: string) {
    return this.db.client.query.productVariants.findMany({
      where: eq(productVariants.productId, productId),
      orderBy: [asc(productVariants.sortOrder), asc(productVariants.createdAt)],
    })
  }

  async createVariant(productId: string, data: Partial<typeof productVariants.$inferInsert>) {
    const [row] = await this.db.client
      .insert(productVariants)
      .values({ ...data, productId } as typeof productVariants.$inferInsert)
      .returning()
    return row
  }

  async updateVariant(variantId: string, data: Partial<typeof productVariants.$inferInsert>) {
    const { id: _ignore, productId: _ignore2, createdAt: _ignore3, ...patch } = data as any
    const [row] = await this.db.client
      .update(productVariants)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(productVariants.id, variantId))
      .returning()
    return row
  }

  async removeVariant(variantId: string) {
    await this.db.client.delete(productVariants).where(eq(productVariants.id, variantId))
  }

  /** Replace ALL variants for a product (used by the CMS bulk editor). */
  async replaceVariants(
    productId: string,
    incoming: Array<Partial<typeof productVariants.$inferInsert> & { id?: string }>,
  ) {
    return this.db.client.transaction(async (tx) => {
      const existing = await tx
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(eq(productVariants.productId, productId))
      const incomingIds = new Set(incoming.map((v) => v.id).filter(Boolean) as string[])
      const toDelete = existing.filter((e) => !incomingIds.has(e.id)).map((e) => e.id)
      for (const id of toDelete) {
        await tx.delete(productVariants).where(eq(productVariants.id, id))
      }
      for (let i = 0; i < incoming.length; i++) {
        const v = incoming[i]
        const sortOrder = v.sortOrder ?? i
        if (v.id && existing.some((e) => e.id === v.id)) {
          const { id: _ignore, productId: _ignore2, createdAt: _ignore3, ...patch } = v as any
          await tx
            .update(productVariants)
            .set({ ...patch, sortOrder, updatedAt: new Date() })
            .where(eq(productVariants.id, v.id))
        } else {
          const { id: _ignore, ...insert } = v as any
          await tx
            .insert(productVariants)
            .values({ ...insert, productId, sortOrder } as typeof productVariants.$inferInsert)
        }
      }
      return tx.query.productVariants.findMany({
        where: eq(productVariants.productId, productId),
        orderBy: [asc(productVariants.sortOrder), asc(productVariants.createdAt)],
      })
    })
  }
}
