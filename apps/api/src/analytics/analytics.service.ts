import { Injectable } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { orders, orderItems, customers, products } from '@trendmarga/db'
import { sql, eq, lte, gte, desc, count, sum, ne } from 'drizzle-orm'

@Injectable()
export class AnalyticsService {
  constructor(private readonly db: DbService) {}

  async getDashboardStats() {
    const db = this.db.client
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [totalOrders] = await db.select({ count: count() }).from(orders)
    const [totalCustomers] = await db.select({ count: count() }).from(customers)
    const [totalProducts] = await db.select({ count: count() }).from(products).where(eq(products.status, 'ACTIVE'))

    const [revenue30d] = await db
      .select({ total: sum(orders.total) })
      .from(orders)
      .where(gte(orders.createdAt, thirtyDaysAgo))

    const [revenueAll] = await db
      .select({ total: sum(orders.total) })
      .from(orders)
      .where(ne(orders.status, 'CANCELLED'))

    const recentOrders = await db.query.orders.findMany({
      with: { customer: true, items: true },
      orderBy: [desc(orders.createdAt)],
      limit: 5,
    })

    const lowStockProducts = await db.query.products.findMany({
      where: lte(products.inventory, 5),
      with: { category: true },
      orderBy: [desc(products.inventory)],
      limit: 8,
    })

    // Order counts by status
    const statusCounts = await db
      .select({ status: orders.status, count: count() })
      .from(orders)
      .groupBy(orders.status)

    const ordersByStatus = Object.fromEntries(statusCounts.map(r => [r.status, r.count]))

    return {
      totalOrders: totalOrders.count,
      totalCustomers: totalCustomers.count,
      totalProducts: totalProducts.count,
      revenue30d: revenue30d.total ?? '0',
      revenueAll: revenueAll.total ?? '0',
      recentOrders,
      lowStockProducts,
      ordersByStatus,
    }
  }
}
