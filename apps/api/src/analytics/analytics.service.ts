import { Injectable } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { orders, orderItems, customers, products } from '@trendmarga/db'
import { sql, eq, lte, gte, desc, count, sum, ne, avg } from 'drizzle-orm'

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

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const revenueByDay = await db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        revenue: sql<string>`COALESCE(SUM(${orders.total}::numeric), 0)::text`,
      })
      .from(orders)
      .where(gte(orders.createdAt, fourteenDaysAgo))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`)

    // ── Average order value (non-cancelled) ──────────────────────────────────
    const [avgOrderValueRow] = await db
      .select({ avg: avg(orders.total) })
      .from(orders)
      .where(ne(orders.status, 'CANCELLED'))

    // ── Top 6 products by revenue ─────────────────────────────────────────────
    const topProducts = await db
      .select({
        productId: orderItems.productId,
        productName: orderItems.productName,
        totalRevenue: sql<string>`SUM(${orderItems.unitPrice}::numeric * ${orderItems.quantity})::text`,
        unitsSold: sql<number>`SUM(${orderItems.quantity})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(ne(orders.status, 'CANCELLED'))
      .groupBy(orderItems.productId, orderItems.productName)
      .orderBy(sql`SUM(${orderItems.unitPrice}::numeric * ${orderItems.quantity}) DESC`)
      .limit(6)

    // ── Order completion rate ─────────────────────────────────────────────────
    const [deliveredRow] = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.status, 'DELIVERED'))
    const completionRate = totalOrders.count > 0
      ? Math.round((deliveredRow.count / totalOrders.count) * 100)
      : 0

    return {
      totalOrders: totalOrders.count,
      totalCustomers: totalCustomers.count,
      totalProducts: totalProducts.count,
      revenue30d: revenue30d.total ?? '0',
      revenueAll: revenueAll.total ?? '0',
      avgOrderValue: avgOrderValueRow.avg ?? '0',
      completionRate,
      recentOrders,
      lowStockProducts,
      ordersByStatus,
      revenueByDay,
      topProducts,
    }
  }
}
