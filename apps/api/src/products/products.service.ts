import { Injectable } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { products, categories, productImages } from '@trendmarga/db'
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

  private attachImages<T extends { imageAssets?: (typeof productImages.$inferSelect)[] }>(
    product: T,
  ): Omit<T, 'imageAssets'> & { imageAssets: ShapedImage[] } {
    const base = publicBaseUrl()
    const sorted = [...(product.imageAssets ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
    return { ...product, imageAssets: sorted.map((r) => shapeImage(r, base)) }
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
      with: { category: true, imageAssets: true },
      orderBy: [desc(products.createdAt)],
    })
    return rows.map((r) => this.attachImages(r as any))
  }

  async findOne(id: string) {
    const row = await this.db.client.query.products.findFirst({
      where: eq(products.id, id),
      with: { category: true, imageAssets: true },
    })
    return row ? this.attachImages(row as any) : null
  }

  async findBySlug(slug: string) {
    const row = await this.db.client.query.products.findFirst({
      where: eq(products.slug, slug),
      with: { category: true, imageAssets: true },
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
}
