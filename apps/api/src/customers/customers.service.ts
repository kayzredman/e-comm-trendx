import { Injectable } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { customers } from '@trendmarga/db'
import { eq, desc } from 'drizzle-orm'

@Injectable()
export class CustomersService {
  constructor(private readonly db: DbService) {}

  findAll() {
    return this.db.client.query.customers.findMany({
      with: { orders: true },
      orderBy: [desc(customers.createdAt)],
    })
  }

  findOne(id: string) {
    return this.db.client.query.customers.findFirst({
      where: eq(customers.id, id),
      with: { orders: { with: { items: true } } },
    })
  }

  async upsertByPhone(data: typeof customers.$inferInsert) {
    const existing = await this.db.client.query.customers.findFirst({
      where: eq(customers.phone, data.phone),
    })
    if (existing) {
      const [updated] = await this.db.client
        .update(customers)
        .set({ name: data.name, email: data.email, address: data.address })
        .where(eq(customers.id, existing.id))
        .returning()
      return updated
    }
    const [created] = await this.db.client.insert(customers).values(data).returning()
    return created
  }
}
