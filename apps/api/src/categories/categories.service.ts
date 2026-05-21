import { Injectable } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { categories } from '@trendmarga/db'
import { eq } from 'drizzle-orm'

@Injectable()
export class CategoriesService {
  constructor(private readonly db: DbService) {}

  findAll() {
    return this.db.client.query.categories.findMany({
      with: { children: true },
      orderBy: categories.name,
    })
  }

  findOne(id: string) {
    return this.db.client.query.categories.findFirst({
      where: eq(categories.id, id),
      with: { children: true, products: true },
    })
  }

  findBySlug(slug: string) {
    return this.db.client.query.categories.findFirst({
      where: eq(categories.slug, slug),
      with: { children: true, products: { with: { category: true }, where: (p: any, { eq: eqFn }: any) => eqFn(p.status, 'ACTIVE') } },
    })
  }

  async create(data: typeof categories.$inferInsert) {
    const [cat] = await this.db.client.insert(categories).values(data).returning()
    return cat
  }

  async update(id: string, data: Partial<typeof categories.$inferInsert>) {
    const [cat] = await this.db.client.update(categories).set(data).where(eq(categories.id, id)).returning()
    return cat
  }

  async remove(id: string) {
    await this.db.client.delete(categories).where(eq(categories.id, id))
  }
}
