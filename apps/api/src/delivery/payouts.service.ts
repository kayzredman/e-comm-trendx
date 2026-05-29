import { BadRequestException, Injectable } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { couriers, deliveryAssignments, payouts } from '@trendmarga/db'
import { and, count, desc, eq, gte, inArray, isNull, lte, sql, sum } from 'drizzle-orm'

@Injectable()
export class PayoutsService {
  constructor(private readonly db: DbService) {}

  /**
   * For each courier, compute deliveries + revenue + owed (unpaid commission)
   * for the given period. "Owed" = sum(commission_amount) of DELIVERED
   * assignments in [from, to] that have not yet been settled to a payout.
   */
  async summary(opts?: { from?: Date; to?: Date }) {
    const from = opts?.from ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const to = opts?.to ?? new Date()

    const rows = await this.db.client
      .select({
        courierId: deliveryAssignments.courierId,
        deliveries: count(deliveryAssignments.id),
        revenue: sql<string>`COALESCE(SUM(${deliveryAssignments.deliveryFee}), '0')`,
        owed: sql<string>`COALESCE(SUM(CASE WHEN ${deliveryAssignments.payoutId} IS NULL THEN ${deliveryAssignments.commissionAmount} ELSE 0 END), '0')`,
      })
      .from(deliveryAssignments)
      .where(and(
        eq(deliveryAssignments.status, 'DELIVERED'),
        gte(deliveryAssignments.deliveredAt, from),
        lte(deliveryAssignments.deliveredAt, to),
      ))
      .groupBy(deliveryAssignments.courierId)

    const allCouriers = await this.db.client.select().from(couriers).where(eq(couriers.isActive, true))
    const byId = new Map(rows.map(r => [r.courierId, r]))

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      couriers: allCouriers.map(c => {
        const r = byId.get(c.id)
        return {
          courier: c,
          deliveries: Number(r?.deliveries ?? 0),
          revenue: r?.revenue ?? '0',
          owed: r?.owed ?? '0',
        }
      }),
    }
  }

  /** Pay out everything currently owed to one courier (DELIVERED + no payoutId). */
  async payCourier(courierId: string, opts: { method?: 'MOMO' | 'CASH' | 'BANK'; reference?: string; notes?: string; paidBy?: string }) {
    const [courier] = await this.db.client.select().from(couriers).where(eq(couriers.id, courierId))
    if (!courier) throw new BadRequestException('Courier not found')

    const pending = await this.db.client.select().from(deliveryAssignments)
      .where(and(
        eq(deliveryAssignments.courierId, courierId),
        eq(deliveryAssignments.status, 'DELIVERED'),
        isNull(deliveryAssignments.payoutId),
      ))

    if (pending.length === 0) throw new BadRequestException('Nothing owed to this courier')

    const amount = pending.reduce((acc, a) => acc + Number(a.commissionAmount), 0)
    const periodFrom = new Date(Math.min(...pending.map(a => +new Date(a.deliveredAt ?? a.assignedAt))))
    const periodTo = new Date(Math.max(...pending.map(a => +new Date(a.deliveredAt ?? a.assignedAt))))

    const [payout] = await this.db.client.insert(payouts).values({
      courierId,
      amount: amount.toFixed(2),
      method: opts.method ?? 'MOMO',
      reference: opts.reference ?? null,
      periodFrom,
      periodTo,
      deliveryCount: pending.length,
      paidBy: opts.paidBy ?? null,
      notes: opts.notes ?? null,
    }).returning()

    await this.db.client.update(deliveryAssignments)
      .set({ payoutId: payout.id })
      .where(inArray(deliveryAssignments.id, pending.map(a => a.id)))

    return payout
  }

  listRecent(limit = 20) {
    return this.db.client
      .select({
        p: payouts,
        c: couriers,
      })
      .from(payouts)
      .leftJoin(couriers, eq(couriers.id, payouts.courierId))
      .orderBy(desc(payouts.paidAt))
      .limit(limit)
      .then(rows => rows.map(r => ({ ...r.p, courier: r.c })))
  }
}
