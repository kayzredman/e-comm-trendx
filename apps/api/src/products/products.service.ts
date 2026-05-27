import { Injectable } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { products, categories } from '@trendmarga/db'
import { eq, desc, ilike, or, and } from 'drizzle-orm'

@Injectable()
export class ProductsService {
  constructor(private readonly db: DbService) {}

  async findAll(opts?: { status?: string; categoryId?: string; search?: string }) {
    const conditions = []
    if (opts?.status) conditions.push(eq(products.status, opts.status as any))
    if (opts?.categoryId) conditions.push(eq(products.categoryId, opts.categoryId))
    if (opts?.search) {
      const term = `%${opts.search.trim()}%`
      const searchExpr = or(ilike(products.name, term), ilike(products.sku, term), ilike(products.description, term))
      if (searchExpr) conditions.push(searchExpr)
    }

    return this.db.client.query.products.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: { category: true },
      orderBy: [desc(products.createdAt)],
    })
  }

  async findOne(id: string) {
    return this.db.client.query.products.findFirst({
      where: eq(products.id, id),
      with: { category: true },
    })
  }

  async findBySlug(slug: string) {
    return this.db.client.query.products.findFirst({
      where: eq(products.slug, slug),
      with: { category: true },
    })
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
