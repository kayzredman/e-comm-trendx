import { Injectable } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { orders, orderItems, customers, products } from '@trendmarga/db'
import { sql, eq, gte, desc, count, sum } from 'drizzle-orm'

@Injectable()
export class AnalyticsService {
  constructor(private readonly db: DbService) {}

  async getDashboardStats() {
    const db = this.db.client
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [totalOrders] = await db.select({ count: count() }).from(orders)
    const [totalCustomers] = await db.select({ count: count() }).from(customers)
    const [totalProducts] = await db.select({ count: count() }).from(products).where(eq(products.status, 'ACTIVE'))
    const [revenue] = await db
      .select({ total: sum(orders.total) })
      .from(orders)
      .where(gte(orders.createdAt, thirtyDaysAgo))

    const recentOrders = await db.query.orders.findMany({
      with: { customer: true, items: true },
      orderBy: [desc(orders.createdAt)],
      limit: 10,
    })

    return {
      totalOrders: totalOrders.count,
      totalCustomers: totalCustomers.count,
      totalProducts: totalProducts.count,
      revenue30d: revenue.total ?? '0',
      recentOrders,
    }
  }
}
