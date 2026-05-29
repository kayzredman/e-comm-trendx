import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { couriers, deliveryAssignments, orders } from '@trendmarga/db'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { DeliveryEventsService } from './events.service'

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly db: DbService,
    private readonly events: DeliveryEventsService,
  ) {}

  /** Snapshot the commission we owe a freelance courier for one delivery. */
  private commissionFor(courier: typeof couriers.$inferSelect, deliveryFee: number): number {
    if (courier.employmentType === 'FLEET') return 0
    if (courier.flatPerDelivery) return Number(courier.flatPerDelivery)
    const pct = Number(courier.commissionPct) / 100
    return Math.round(deliveryFee * pct * 100) / 100
  }

  async assign(orderId: string, courierId: string, actor?: { id?: string; name?: string }) {
    const [order] = await this.db.client.select().from(orders).where(eq(orders.id, orderId))
    if (!order) throw new NotFoundException(`Order ${orderId} not found`)

    const [courier] = await this.db.client.select().from(couriers).where(eq(couriers.id, courierId))
    if (!courier) throw new NotFoundException(`Courier ${courierId} not found`)
    if (!courier.isActive) throw new BadRequestException('Courier is inactive')

    // Cancel any prior ASSIGNED rows for this order (reassign)
    await this.db.client.update(deliveryAssignments)
      .set({ status: 'CANCELLED' })
      .where(and(eq(deliveryAssignments.orderId, orderId), eq(deliveryAssignments.status, 'ASSIGNED')))

    const deliveryFee = Number(order.deliveryFee)
    const commission = this.commissionFor(courier, deliveryFee)

    const [assignment] = await this.db.client.insert(deliveryAssignments).values({
      orderId,
      courierId,
      deliveryFee: String(deliveryFee),
      commissionAmount: String(commission),
      assignedBy: actor?.id ?? null,
    }).returning()

    await this.events.record({
      orderId,
      type: 'ASSIGNED',
      courierId,
      actorId: actor?.id,
      actorName: actor?.name,
      note: `Assigned to ${courier.name}`,
    })

    return assignment
  }

  /** Mark the current ASSIGNED row for this order as PICKED_UP / DELIVERED / FAILED. */
  async transition(
    orderId: string,
    next: 'PICKED_UP' | 'DELIVERED' | 'FAILED',
    actor?: { id?: string; name?: string; reason?: string },
  ) {
    const rows = await this.db.client.select().from(deliveryAssignments)
      .where(and(
        eq(deliveryAssignments.orderId, orderId),
        inArray(deliveryAssignments.status, ['ASSIGNED', 'PICKED_UP']),
      ))
      .orderBy(desc(deliveryAssignments.assignedAt))
      .limit(1)

    const current = rows[0]
    if (!current) throw new BadRequestException('No active assignment for this order')

    const patch: Partial<typeof deliveryAssignments.$inferInsert> = { status: next }
    if (next === 'PICKED_UP') patch.pickedUpAt = new Date()
    if (next === 'DELIVERED') patch.deliveredAt = new Date()
    if (next === 'FAILED') { patch.failedAt = new Date(); patch.failureReason = actor?.reason ?? null }

    const [updated] = await this.db.client.update(deliveryAssignments)
      .set(patch)
      .where(eq(deliveryAssignments.id, current.id))
      .returning()

    await this.events.record({
      orderId,
      type: next,
      courierId: current.courierId,
      actorId: actor?.id,
      actorName: actor?.name,
      note: actor?.reason,
    })

    return updated
  }

  async getForOrder(orderId: string) {
    const rows = await this.db.client
      .select({
        a: deliveryAssignments,
        c: couriers,
      })
      .from(deliveryAssignments)
      .leftJoin(couriers, eq(couriers.id, deliveryAssignments.courierId))
      .where(eq(deliveryAssignments.orderId, orderId))
      .orderBy(desc(deliveryAssignments.assignedAt))
    return rows.map(r => ({ ...r.a, courier: r.c }))
  }

  /** Currently-active assignment (ASSIGNED or PICKED_UP). */
  async getActive(orderId: string) {
    const rows = await this.db.client
      .select({
        a: deliveryAssignments,
        c: couriers,
      })
      .from(deliveryAssignments)
      .leftJoin(couriers, eq(couriers.id, deliveryAssignments.courierId))
      .where(and(
        eq(deliveryAssignments.orderId, orderId),
        inArray(deliveryAssignments.status, ['ASSIGNED', 'PICKED_UP']),
      ))
      .orderBy(desc(deliveryAssignments.assignedAt))
      .limit(1)
    if (!rows[0]) return null
    return { ...rows[0].a, courier: rows[0].c }
  }
}
