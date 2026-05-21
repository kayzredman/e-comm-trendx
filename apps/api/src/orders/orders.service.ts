import { Injectable, NotFoundException } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { orders, orderItems, customers } from '@trendmarga/db'
import { eq, desc } from 'drizzle-orm'

@Injectable()
export class OrdersService {
  constructor(private readonly db: DbService) {}

  findAll() {
    return this.db.client.query.orders.findMany({
      with: { customer: true, items: true },
      orderBy: [desc(orders.createdAt)],
    })
  }

  async findOne(id: string) {
    const order = await this.db.client.query.orders.findFirst({
      where: eq(orders.id, id),
      with: { customer: true, items: true },
    })
    if (!order) throw new NotFoundException(`Order ${id} not found`)
    return order
  }

  async updateStatus(id: string, status: typeof orders.$inferInsert['status']) {
    const [order] = await this.db.client
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning()
    return order
  }

  async create(data: { order: typeof orders.$inferInsert; items: Omit<typeof orderItems.$inferInsert, 'orderId'>[] }) {
    return this.db.client.transaction(async (tx) => {
      const [order] = await tx.insert(orders).values(data.order).returning()
      const insertedItems = await tx.insert(orderItems).values(
        data.items.map(item => ({ ...item, orderId: order.id }))
      ).returning()
      return { ...order, items: insertedItems }
    })
  }
}
