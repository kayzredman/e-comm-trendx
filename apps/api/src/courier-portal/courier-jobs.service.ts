import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DbService } from '../db/db.service'
import {
  couriers, deliveryAssignments, deliveryZones, orders, orderItems, customers,
} from '@trendmarga/db'
import { and, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm'
import { AssignmentsService } from '../delivery/assignments.service'
import { OrdersService } from '../orders/orders.service'

@Injectable()
export class CourierJobsService {
  constructor(
    private readonly db: DbService,
    private readonly assignments: AssignmentsService,
    private readonly ordersSvc: OrdersService,
  ) {}

  /** Active jobs (ASSIGNED + PICKED_UP) for the signed-in courier. */
  async listActive(courierId: string) {
    const rows = await this.db.client
      .select({ a: deliveryAssignments, o: orders, c: customers, z: deliveryZones })
      .from(deliveryAssignments)
      .leftJoin(orders, eq(orders.id, deliveryAssignments.orderId))
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .leftJoin(deliveryZones, eq(deliveryZones.id, orders.zoneId))
      .where(and(
        eq(deliveryAssignments.courierId, courierId),
        inArray(deliveryAssignments.status, ['ASSIGNED', 'PICKED_UP']),
      ))
      .orderBy(desc(deliveryAssignments.assignedAt))

    return rows.map(this.shape)
  }

  /** Recent completed/failed jobs (last 14 days). */
  async listHistory(courierId: string) {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60_000)
    const rows = await this.db.client
      .select({ a: deliveryAssignments, o: orders, c: customers, z: deliveryZones })
      .from(deliveryAssignments)
      .leftJoin(orders, eq(orders.id, deliveryAssignments.orderId))
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .leftJoin(deliveryZones, eq(deliveryZones.id, orders.zoneId))
      .where(and(
        eq(deliveryAssignments.courierId, courierId),
        inArray(deliveryAssignments.status, ['DELIVERED', 'FAILED']),
        gte(deliveryAssignments.assignedAt, since),
      ))
      .orderBy(desc(deliveryAssignments.assignedAt))
      .limit(50)
    return rows.map(this.shape)
  }

  async get(courierId: string, orderId: string) {
    const rows = await this.db.client
      .select({ a: deliveryAssignments, o: orders, c: customers, z: deliveryZones })
      .from(deliveryAssignments)
      .leftJoin(orders, eq(orders.id, deliveryAssignments.orderId))
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .leftJoin(deliveryZones, eq(deliveryZones.id, orders.zoneId))
      .where(and(eq(deliveryAssignments.orderId, orderId), eq(deliveryAssignments.courierId, courierId)))
      .orderBy(desc(deliveryAssignments.assignedAt))
      .limit(1)

    if (!rows[0]) throw new NotFoundException('Job not found or not assigned to you')
    const items = await this.db.client.select().from(orderItems).where(eq(orderItems.orderId, orderId))
    return { ...this.shape(rows[0]), items }
  }

  /** Courier marks the parcel as picked up from warehouse. */
  async pickup(courierId: string, orderId: string, courier: typeof couriers.$inferSelect) {
    await this.assertOwned(courierId, orderId, 'ASSIGNED')
    const updated = await this.assignments.transition(orderId, 'PICKED_UP', {
      id: courier.id,
      name: `${courier.name} (courier)`,
    })
    // Order status → OUT_FOR_DELIVERY
    await this.ordersSvc.updateStatus(orderId, 'OUT_FOR_DELIVERY').catch(() => {})
    return updated
  }

  /** Courier confirms delivery by entering the 4-digit code the customer received. */
  async deliver(courierId: string, orderId: string, code: string, courier: typeof couriers.$inferSelect) {
    const job = await this.assertOwned(courierId, orderId, 'PICKED_UP')

    const [order] = await this.db.client.select().from(orders).where(eq(orders.id, orderId))
    if (!order) throw new NotFoundException('Order not found')
    if (!order.deliveryCode) throw new BadRequestException('No delivery code on this order — ask dispatch')
    if (String(code).trim() !== order.deliveryCode) {
      throw new BadRequestException('Code does not match')
    }

    const updated = await this.assignments.transition(orderId, 'DELIVERED', {
      id: courier.id,
      name: `${courier.name} (courier)`,
    })
    await this.ordersSvc.updateStatus(orderId, 'DELIVERED').catch(() => {})
    return updated
  }

  async fail(courierId: string, orderId: string, reason: string, courier: typeof couriers.$inferSelect) {
    await this.assertOwned(courierId, orderId)
    if (!reason?.trim()) throw new BadRequestException('Reason required')
    return this.assignments.transition(orderId, 'FAILED', {
      id: courier.id,
      name: `${courier.name} (courier)`,
      reason: reason.trim().slice(0, 500),
    })
  }

  /** Ensure the job belongs to this courier and is in an expected state. */
  private async assertOwned(courierId: string, orderId: string, expectedStatus?: 'ASSIGNED' | 'PICKED_UP') {
    const rows = await this.db.client.select().from(deliveryAssignments)
      .where(and(
        eq(deliveryAssignments.orderId, orderId),
        eq(deliveryAssignments.courierId, courierId),
        inArray(deliveryAssignments.status, ['ASSIGNED', 'PICKED_UP']),
      ))
      .orderBy(desc(deliveryAssignments.assignedAt))
      .limit(1)
    const job = rows[0]
    if (!job) throw new ForbiddenException('Not your job')
    if (expectedStatus && job.status !== expectedStatus) {
      throw new BadRequestException(`Job is ${job.status}, expected ${expectedStatus}`)
    }
    return job
  }

  /** Strip courier-sensitive fields & flatten into a job payload the PWA renders. */
  private shape = (row: {
    a: typeof deliveryAssignments.$inferSelect
    o: typeof orders.$inferSelect | null
    c: typeof customers.$inferSelect | null
    z: typeof deliveryZones.$inferSelect | null
  }) => {
    const order = row.o
    const cust = row.c
    return {
      assignmentId: row.a.id,
      orderId: row.a.orderId,
      status: row.a.status,
      assignedAt: row.a.assignedAt,
      pickedUpAt: row.a.pickedUpAt,
      deliveredAt: row.a.deliveredAt,
      failedAt: row.a.failedAt,
      failureReason: row.a.failureReason,
      commissionAmount: row.a.commissionAmount,
      order: order ? {
        id: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        total: order.total,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        notes: order.notes,
        createdAt: order.createdAt,
      } : null,
      customer: cust ? {
        name: cust.name,
        phone: cust.phone,
        address: cust.address,
      } : null,
      zone: row.z ? { id: row.z.id, name: row.z.name } : null,
    }
  }
}
