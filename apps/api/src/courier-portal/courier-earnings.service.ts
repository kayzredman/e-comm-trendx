import { Injectable } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { couriers, deliveryAssignments, payouts } from '@trendmarga/db'
import { and, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm'

@Injectable()
export class CourierEarningsService {
  constructor(private readonly db: DbService) {}

  /** Current-cycle summary + last 30 days delivery rows for the rider. */
  async forCourier(courierId: string) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60_000)

    const [c] = await this.db.client.select().from(couriers).where(eq(couriers.id, courierId))

    const recent = await this.db.client.select().from(deliveryAssignments)
      .where(and(
        eq(deliveryAssignments.courierId, courierId),
        gte(deliveryAssignments.assignedAt, since),
      ))
      .orderBy(desc(deliveryAssignments.assignedAt))

    const delivered = recent.filter(r => r.status === 'DELIVERED')
    const failed = recent.filter(r => r.status === 'FAILED')

    // Unpaid commission = DELIVERED + payoutId is null
    const owedRows = await this.db.client.select().from(deliveryAssignments)
      .where(and(
        eq(deliveryAssignments.courierId, courierId),
        eq(deliveryAssignments.status, 'DELIVERED'),
        isNull(deliveryAssignments.payoutId),
      ))
    const owed = owedRows.reduce((acc, r) => acc + Number(r.commissionAmount), 0)

    const lastPayout = await this.db.client.select().from(payouts)
      .where(eq(payouts.courierId, courierId))
      .orderBy(desc(payouts.paidAt))
      .limit(1)

    const total = delivered.reduce((acc, r) => acc + Number(r.commissionAmount), 0)
    const totalRevenue = delivered.reduce((acc, r) => acc + Number(r.deliveryFee), 0)

    return {
      courier: c ? {
        id: c.id, name: c.name, phone: c.phone, vehicle: c.vehicle,
        employmentType: c.employmentType, commissionPct: c.commissionPct,
        momoNumber: c.momoNumber,
      } : null,
      cycle: {
        from: since.toISOString(),
        to: new Date().toISOString(),
        delivered: delivered.length,
        failed: failed.length,
        earned: total.toFixed(2),
        revenue: totalRevenue.toFixed(2),
      },
      owed: owed.toFixed(2),
      lastPayout: lastPayout[0] ?? null,
      recent: delivered.slice(0, 20).map(r => ({
        assignmentId: r.id,
        orderId: r.orderId,
        amount: r.commissionAmount,
        deliveredAt: r.deliveredAt,
      })),
    }
  }
}
