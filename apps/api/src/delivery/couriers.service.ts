import { Injectable, NotFoundException } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { couriers, deliveryAssignments } from '@trendmarga/db'
import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm'

@Injectable()
export class CouriersService {
  constructor(private readonly db: DbService) {}

  list(opts?: { activeOnly?: boolean }) {
    if (opts?.activeOnly) {
      return this.db.client.select().from(couriers)
        .where(eq(couriers.isActive, true))
        .orderBy(desc(couriers.createdAt))
    }
    return this.db.client.select().from(couriers).orderBy(desc(couriers.createdAt))
  }

  async get(id: string) {
    const [c] = await this.db.client.select().from(couriers).where(eq(couriers.id, id))
    if (!c) throw new NotFoundException(`Courier ${id} not found`)
    return c
  }

  async create(data: typeof couriers.$inferInsert) {
    const [c] = await this.db.client.insert(couriers).values(data).returning()
    return c
  }

  async update(id: string, data: Partial<typeof couriers.$inferInsert>) {
    const [c] = await this.db.client.update(couriers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(couriers.id, id))
      .returning()
    if (!c) throw new NotFoundException(`Courier ${id} not found`)
    return c
  }

  async deactivate(id: string) {
    return this.update(id, { isActive: false })
  }

  /** Stats for the couriers list page (last 30 days). */
  async listWithStats() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const all = await this.list()
    const stats = await this.db.client
      .select({
        courierId: deliveryAssignments.courierId,
        deliveries: count(deliveryAssignments.id),
        delivered: sql<number>`SUM(CASE WHEN ${deliveryAssignments.status} = 'DELIVERED' THEN 1 ELSE 0 END)`,
      })
      .from(deliveryAssignments)
      .where(gte(deliveryAssignments.assignedAt, since))
      .groupBy(deliveryAssignments.courierId)

    const statByCourier = new Map(stats.map(s => [s.courierId, s]))
    return all.map(c => {
      const s = statByCourier.get(c.id)
      const total = Number(s?.deliveries ?? 0)
      const delivered = Number(s?.delivered ?? 0)
      return {
        ...c,
        deliveries30d: total,
        delivered30d: delivered,
        onTimePct: total > 0 ? Math.round((delivered / total) * 100) : null,
      }
    })
  }
}
