import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { orders, paymentVerifications } from '@trendmarga/db'
import { and, count, desc, eq, gte, sql } from 'drizzle-orm'
import { DeliveryEventsService } from './events.service'

@Injectable()
export class PaymentVerificationsService {
  constructor(
    private readonly db: DbService,
    private readonly events: DeliveryEventsService,
  ) {}

  /** Customer-side: submit a manual MoMo proof for an order. */
  async submit(input: {
    orderId: string
    amount: number
    provider: typeof paymentVerifications.$inferInsert['provider']
    providerRef?: string
    fromPhone?: string
    screenshotUrl?: string
  }) {
    const [order] = await this.db.client.select().from(orders).where(eq(orders.id, input.orderId))
    if (!order) throw new NotFoundException('Order not found')

    const [pv] = await this.db.client.insert(paymentVerifications).values({
      orderId: input.orderId,
      amount: input.amount.toFixed(2),
      provider: input.provider,
      providerRef: input.providerRef ?? null,
      fromPhone: input.fromPhone ?? null,
      screenshotUrl: input.screenshotUrl ?? null,
    }).returning()

    return pv
  }

  listPending() {
    return this.db.client
      .select({
        v: paymentVerifications,
        o: orders,
      })
      .from(paymentVerifications)
      .leftJoin(orders, eq(orders.id, paymentVerifications.orderId))
      .where(eq(paymentVerifications.status, 'PENDING'))
      .orderBy(desc(paymentVerifications.createdAt))
      .then(rows => rows.map(r => ({ ...r.v, order: r.o })))
  }

  async confirm(id: string, actor?: { id?: string; name?: string }) {
    const [pv] = await this.db.client.select().from(paymentVerifications).where(eq(paymentVerifications.id, id))
    if (!pv) throw new NotFoundException('Verification not found')
    if (pv.status !== 'PENDING') throw new BadRequestException(`Already ${pv.status.toLowerCase()}`)

    const now = new Date()
    await this.db.client.transaction(async (tx) => {
      await tx.update(paymentVerifications)
        .set({ status: 'VERIFIED', verifiedBy: actor?.id ?? null, verifiedAt: now })
        .where(eq(paymentVerifications.id, id))
      await tx.update(orders)
        .set({ paymentStatus: 'PAID', paidAt: now, updatedAt: now })
        .where(eq(orders.id, pv.orderId))
    })

    await this.events.record({
      orderId: pv.orderId,
      type: 'PAYMENT_VERIFIED',
      actorId: actor?.id,
      actorName: actor?.name,
      note: `${pv.provider} · ${pv.providerRef ?? 'no ref'}`,
    })

    return { id, status: 'VERIFIED' as const }
  }

  async reject(id: string, reason: string, actor?: { id?: string; name?: string }) {
    const [pv] = await this.db.client.select().from(paymentVerifications).where(eq(paymentVerifications.id, id))
    if (!pv) throw new NotFoundException('Verification not found')
    if (pv.status !== 'PENDING') throw new BadRequestException(`Already ${pv.status.toLowerCase()}`)

    await this.db.client.update(paymentVerifications)
      .set({ status: 'REJECTED', rejectionReason: reason, verifiedBy: actor?.id ?? null, verifiedAt: new Date() })
      .where(eq(paymentVerifications.id, id))

    await this.events.record({
      orderId: pv.orderId,
      type: 'PAYMENT_REJECTED',
      actorId: actor?.id,
      actorName: actor?.name,
      note: reason,
    })

    return { id, status: 'REJECTED' as const }
  }

  async stats() {
    const since = new Date(); since.setHours(0, 0, 0, 0)
    const [pendingRow] = await this.db.client
      .select({
        n: count(paymentVerifications.id),
        amount: sql<string>`COALESCE(SUM(${paymentVerifications.amount}), '0')`,
      })
      .from(paymentVerifications)
      .where(eq(paymentVerifications.status, 'PENDING'))

    const [verifiedTodayRow] = await this.db.client
      .select({
        n: count(paymentVerifications.id),
        amount: sql<string>`COALESCE(SUM(${paymentVerifications.amount}), '0')`,
      })
      .from(paymentVerifications)
      .where(and(eq(paymentVerifications.status, 'VERIFIED'), gte(paymentVerifications.verifiedAt, since)))

    return {
      pending: { count: Number(pendingRow?.n ?? 0), amount: pendingRow?.amount ?? '0' },
      verifiedToday: { count: Number(verifiedTodayRow?.n ?? 0), amount: verifiedTodayRow?.amount ?? '0' },
    }
  }
}
