import { Injectable } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { cmsSections } from '@trendmarga/db'
import { eq, asc } from 'drizzle-orm'

@Injectable()
export class CmsService {
  constructor(private readonly db: DbService) {}

  getPageSections(page: string = 'HOME') {
    return this.db.client.query.cmsSections.findMany({
      where: eq(cmsSections.page, page as any),
      orderBy: [asc(cmsSections.order)],
    })
  }

  async upsertSection(data: typeof cmsSections.$inferInsert) {
    if (data.id) {
      const [s] = await this.db.client
        .update(cmsSections)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(cmsSections.id, data.id))
        .returning()
      return s
    }
    const [s] = await this.db.client.insert(cmsSections).values(data).returning()
    return s
  }

  async remove(id: string) {
    await this.db.client.delete(cmsSections).where(eq(cmsSections.id, id))
  }
}
