import { Injectable } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { orders, orderItems, customers, products } from '@trendmarga/db'
import { sql, eq, lte, gte, desc, asc, count, sum, ne, avg, inArray, and } from 'drizzle-orm'

@Injectable()
export class AnalyticsService {
  constructor(private readonly db: DbService) {}

  async getDashboardStats() {
    const db = this.db.client
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const [
      [totalOrders],
      [totalCustomers],
      [totalProducts],
      [revenue30d],
      [revenueAll],
      recentOrders,
      lowStockProducts,
      statusCounts,
      revenueByDay,
      [avgOrderValueRow],
      topProducts,
      [deliveredRow],
      [confirmedRow],
      [processingRow],
      [outForDeliveryRow],
      [deliveredTodayRow],
      activeDeliveriesRaw,
    ] = await Promise.all([
      db.select({ count: count() }).from(orders),
      db.select({ count: count() }).from(customers),
      db.select({ count: count() }).from(products).where(eq(products.status, 'ACTIVE')),
      db.select({ total: sum(orders.total) }).from(orders).where(gte(orders.createdAt, thirtyDaysAgo)),
      db.select({ total: sum(orders.total) }).from(orders).where(ne(orders.status, 'CANCELLED')),
      db.query.orders.findMany({
        with: { customer: true, items: true },
        orderBy: [desc(orders.createdAt)],
        limit: 5,
      }),
      db.query.products.findMany({
        where: lte(products.inventory, 5),
        with: { category: true },
        orderBy: [desc(products.inventory)],
        limit: 8,
      }),
      db.select({ status: orders.status, count: count() }).from(orders).groupBy(orders.status),
      db
        .select({
          date: sql<string>`DATE(${orders.createdAt})`,
          revenue: sql<string>`COALESCE(SUM(${orders.total}::numeric), 0)::text`,
        })
        .from(orders)
        .where(gte(orders.createdAt, fourteenDaysAgo))
        .groupBy(sql`DATE(${orders.createdAt})`)
        .orderBy(sql`DATE(${orders.createdAt})`),
      db.select({ avg: avg(orders.total) }).from(orders).where(ne(orders.status, 'CANCELLED')),
      db
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
        .limit(6),
      db.select({ count: count() }).from(orders).where(eq(orders.status, 'DELIVERED')),
      db.select({ count: count() }).from(orders).where(eq(orders.status, 'CONFIRMED')),
      db.select({ count: count() }).from(orders).where(eq(orders.status, 'PROCESSING')),
      db.select({ count: count() }).from(orders).where(eq(orders.status, 'OUT_FOR_DELIVERY')),
      db
        .select({ count: count() })
        .from(orders)
        .where(and(eq(orders.status, 'DELIVERED'), gte(orders.updatedAt, startOfToday))),
      db.query.orders.findMany({
        where: inArray(orders.status, ['PROCESSING', 'OUT_FOR_DELIVERY']),
        with: { customer: true },
        orderBy: [asc(orders.updatedAt)],
        limit: 5,
      }),
    ])

    const ordersByStatus = Object.fromEntries(statusCounts.map(r => [r.status, r.count]))
    const completionRate = totalOrders.count > 0
      ? Math.round((deliveredRow.count / totalOrders.count) * 100)
      : 0

    const deliveryPipeline = {
      confirmed: confirmedRow.count,
      processing: processingRow.count,
      outForDelivery: outForDeliveryRow.count,
      deliveredToday: deliveredTodayRow.count,
    }

    const activeDeliveries = activeDeliveriesRaw.map(o => ({
      id: o.id,
      status: o.status,
      total: o.total,
      updatedAt: o.updatedAt,
      createdAt: o.createdAt,
      customerName: o.customer?.name ?? 'Unknown',
      city: (o.customer?.address as any)?.city ?? null,
      region: (o.customer?.address as any)?.region ?? null,
    }))

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
      deliveryPipeline,
      activeDeliveries,
    }
  }
}
