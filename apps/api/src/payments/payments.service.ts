import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { paymentIntents, paymentEvents, orders, customers } from '@trendmarga/db'
import { and, desc, eq, isNotNull, isNull, lt, sql } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { PaystackClient, type PaystackVerifyResponse } from './paystack.client'

export type IntentChannel = 'CARD' | 'MOBILE_MONEY' | 'BANK' | 'USSD' | 'QR' | 'UNKNOWN'
export type IntentStatus = 'REQUIRES_AUTH' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'ABANDONED'

interface RecordEventArgs {
  eventType: string
  reference?: string | null
  intentId?: string | null
  orderId?: string | null
  amount?: number | null         // major units (GH₵)
  currency?: string | null
  status?: 'SUCCESS' | 'FAILED' | 'PENDING' | null
  rawPayload: unknown
  signatureValid: boolean
  source: 'webhook' | 'verify-api' | 'manual-replay'
  webhookId?: string | null
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)

  constructor(
    private readonly db: DbService,
    private readonly paystack: PaystackClient,
  ) {}

  /**
   * Create a new Paystack intent for an order. Idempotent on (orderId, status='REQUIRES_AUTH'):
   * if a fresh REQUIRES_AUTH intent already exists, return it.
   */
  async initIntent(orderId: string, opts: { channel?: IntentChannel } = {}) {
    const [order] = await this.db.client.select().from(orders).where(eq(orders.id, orderId))
    if (!order) throw new NotFoundException(`Order ${orderId} not found`)
    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException('Order already paid')
    }

    let email: string | undefined
    if (order.customerId) {
      const [cust] = await this.db.client.select({ email: customers.email })
        .from(customers).where(eq(customers.id, order.customerId))
      email = cust?.email ?? undefined
    }
    if (!email) email = `guest+${orderId}@trendmarga.com`

    // Re-use an open intent if it exists (idempotency at the order level).
    const [existing] = await this.db.client.select().from(paymentIntents)
      .where(and(eq(paymentIntents.orderId, orderId), eq(paymentIntents.status, 'REQUIRES_AUTH')))
      .orderBy(desc(paymentIntents.createdAt)).limit(1)
    if (existing && existing.authorizationUrl) return existing

    const reference = `tm_${orderId}_${Date.now().toString(36)}_${createId().slice(0, 6)}`
    const amountKobo = Math.round(Number(order.total) * 100)
    const callbackUrl = process.env.PAYSTACK_CALLBACK_URL
      ?? (process.env.WEB_URL ? `${process.env.WEB_URL}/checkout/return` : undefined)
    const currency = (process.env.STORE_CURRENCY ?? 'GHS').toUpperCase()

    const channels = opts.channel
      ? [this.toPaystackChannel(opts.channel)]
      : undefined

    const init = await this.paystack.initializeTransaction({
      email,
      amountKobo,
      currency,
      reference,
      callbackUrl,
      channels,
      metadata: { orderId, source: 'storefront' },
    })

    const [created] = await this.db.client.insert(paymentIntents).values({
      orderId,
      providerReference: reference,
      amount: order.total,
      currency,
      channel: opts.channel ?? 'UNKNOWN',
      status: 'REQUIRES_AUTH',
      authorizationUrl: init.authorization_url,
      accessCode: init.access_code,
    }).returning()
    return created
  }

  async findIntentByReference(reference: string) {
    const [row] = await this.db.client.select().from(paymentIntents)
      .where(eq(paymentIntents.providerReference, reference))
    return row ?? null
  }

  async listIntents(opts: { limit?: number; status?: IntentStatus } = {}) {
    const limit = Math.min(opts.limit ?? 50, 200)
    const where = opts.status ? eq(paymentIntents.status, opts.status) : undefined
    const q = this.db.client.select().from(paymentIntents).orderBy(desc(paymentIntents.createdAt)).limit(limit)
    return where ? q.where(where) : q
  }

  async listEvents(opts: { limit?: number; reference?: string; intentId?: string } = {}) {
    const limit = Math.min(opts.limit ?? 100, 500)
    const filters = []
    if (opts.reference) filters.push(eq(paymentEvents.reference, opts.reference))
    if (opts.intentId) filters.push(eq(paymentEvents.intentId, opts.intentId))
    const q = this.db.client.select().from(paymentEvents).orderBy(desc(paymentEvents.receivedAt)).limit(limit)
    return filters.length ? q.where(and(...filters)) : q
  }

  /**
   * Webhook entry point — persists raw payload FIRST, then processes.
   * Returns the event row so the controller can include the id in the 200 OK.
   */
  async handleWebhook(rawBody: unknown, signatureHeader: string | undefined) {
    const signatureValid = this.paystack.verifySignature(rawBody as object, signatureHeader)
    const payload = (rawBody ?? {}) as any
    const eventType: string = String(payload?.event ?? 'unknown')
    const data = payload?.data ?? {}
    const reference: string | undefined = data?.reference
    const amountMajor: number | null = typeof data?.amount === 'number' ? data.amount / 100 : null
    const status = this.normalizeStatus(eventType, data?.status)

    // Find intent (may be null for transfer / settlement events we ignore).
    const intent = reference ? await this.findIntentByReference(reference) : null

    const evt = await this.recordEvent({
      eventType,
      reference: reference ?? null,
      intentId: intent?.id ?? null,
      orderId: intent?.orderId ?? null,
      amount: amountMajor,
      currency: data?.currency ?? null,
      status,
      rawPayload: payload,
      signatureValid,
      source: 'webhook',
      webhookId: reference ?? null,
    })

    if (!signatureValid) {
      await this.markEventProcessed(evt.id, 'rejected: bad signature')
      return { ok: false, eventId: evt.id, reason: 'bad-signature' }
    }
    if (!intent) {
      await this.markEventProcessed(evt.id, 'no-intent-match')
      return { ok: true, eventId: evt.id, reason: 'no-intent-match' }
    }

    try {
      await this.applyOutcome(intent.id, eventType, data, evt.id)
      await this.markEventProcessed(evt.id, null)
      return { ok: true, eventId: evt.id }
    } catch (err) {
      const msg = (err as Error)?.message?.slice(0, 500) ?? 'unknown'
      await this.markEventProcessed(evt.id, msg)
      this.logger.error(`Webhook processing failed for ${reference}: ${msg}`)
      return { ok: false, eventId: evt.id, reason: msg }
    }
  }

  /**
   * Reconciliation: for any intent stuck in REQUIRES_AUTH / PROCESSING
   * older than 10 min, call /verify and converge state.
   */
  async reconcileStuck(maxAgeMinutes = 10) {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60_000)
    const stuck = await this.db.client.select().from(paymentIntents).where(
      and(
        lt(paymentIntents.updatedAt, cutoff),
        sql`${paymentIntents.status} IN ('REQUIRES_AUTH', 'PROCESSING')`,
      ),
    ).limit(50)

    let checked = 0, converged = 0
    for (const intent of stuck) {
      checked++
      try {
        const v = await this.paystack.verifyTransaction(intent.providerReference)
        const evt = await this.recordEvent({
          eventType: `verify.${v.status}`,
          reference: v.reference,
          intentId: intent.id,
          orderId: intent.orderId,
          amount: v.amount / 100,
          currency: v.currency,
          status: this.normalizeStatus(`verify.${v.status}`, v.status),
          rawPayload: v.raw,
          signatureValid: true,             // /verify is server-to-server over TLS
          source: 'verify-api',
        })
        await this.applyOutcome(intent.id, `verify.${v.status}`, v.raw, evt.id)
        await this.markEventProcessed(evt.id, null)
        converged++
      } catch (err) {
        this.logger.warn(`Reconcile failed for ${intent.providerReference}: ${(err as Error)?.message}`)
      }
    }
    return { checked, converged }
  }

  /**
   * Manual replay from CMS — re-runs applyOutcome from the stored raw payload
   * of an event without re-hitting Paystack. Useful when the first processing
   * failed (e.g. DB blip) and the event sat in the table.
   */
  async replayEvent(eventId: string) {
    const [evt] = await this.db.client.select().from(paymentEvents).where(eq(paymentEvents.id, eventId))
    if (!evt) throw new NotFoundException(`Event ${eventId} not found`)
    if (!evt.intentId) throw new BadRequestException('Event has no linked intent')
    const data = (evt.rawPayload as any)?.data ?? evt.rawPayload
    try {
      await this.applyOutcome(evt.intentId, evt.eventType, data, evt.id)
      await this.markEventProcessed(evt.id, null)
      return { ok: true }
    } catch (err) {
      const msg = (err as Error)?.message?.slice(0, 500) ?? 'unknown'
      await this.markEventProcessed(evt.id, msg)
      throw err
    }
  }

  /**
   * Issue a refund via Paystack. `amount` is major-units; omit for full refund of the
   * remaining (non-refunded) balance. Writes a `refund.requested` event row immediately
   * and the final outcome lands via the `refund.processed` / `refund.failed` webhook.
   */
  async refundIntent(
    intentId: string,
    opts: { amount?: number; reason?: string; actorId?: string | null } = {},
  ) {
    const [intent] = await this.db.client.select().from(paymentIntents).where(eq(paymentIntents.id, intentId))
    if (!intent) throw new NotFoundException(`Intent ${intentId} not found`)
    if (intent.status !== 'SUCCEEDED') {
      throw new BadRequestException(`Cannot refund intent in status ${intent.status}`)
    }
    const charged = Number(intent.amount)
    const alreadyRefunded = Number(intent.refundedAmount ?? 0)
    const remaining = +(charged - alreadyRefunded).toFixed(2)
    if (remaining <= 0) throw new BadRequestException('Intent is already fully refunded')

    const amount = opts.amount != null ? Number(opts.amount) : remaining
    if (amount <= 0) throw new BadRequestException('Refund amount must be > 0')
    if (amount > remaining) {
      throw new BadRequestException(`Refund amount ${amount} exceeds remaining ${remaining}`)
    }

    const refund = await this.paystack.createRefund({
      transactionReference: intent.providerReference,
      amountKobo: Math.round(amount * 100),
      currency: intent.currency,
      merchantNote: opts.reason ?? `Refund requested${opts.actorId ? ` by ${opts.actorId}` : ''}`,
      customerNote: opts.reason,
    })

    await this.recordEvent({
      eventType: 'refund.requested',
      reference: intent.providerReference,
      intentId: intent.id,
      orderId: intent.orderId,
      amount,
      currency: intent.currency,
      status: 'PENDING',
      rawPayload: { requested: { amount, reason: opts.reason, actorId: opts.actorId }, paystack: refund },
      signatureValid: true,
      source: 'manual-replay',
    })

    // If Paystack returns processed synchronously (rare for instant test refunds), settle now.
    if (String(refund?.status ?? '').toLowerCase() === 'processed') {
      await this.applyRefundOutcome(intent.id, amount, 'processed', refund)
    }

    return { ok: true, refund }
  }

  /** Apply refund outcome to intent + order. Idempotent on (intent, amount, status). */
  private async applyRefundOutcome(
    intentId: string,
    amount: number,
    status: 'processed' | 'failed' | 'pending' | 'processing',
    raw: unknown,
  ) {
    if (status !== 'processed') return
    const [intent] = await this.db.client.select().from(paymentIntents).where(eq(paymentIntents.id, intentId))
    if (!intent) return
    const charged = Number(intent.amount)
    const already = Number(intent.refundedAmount ?? 0)
    const next = Math.min(+(already + amount).toFixed(2), charged)
    await this.db.client.update(paymentIntents).set({
      refundedAmount: String(next),
      metadata: { ...(intent.metadata ?? {}), lastRefund: raw },
      updatedAt: new Date(),
    }).where(eq(paymentIntents.id, intentId))

    if (next >= charged) {
      await this.db.client.update(orders).set({
        paymentStatus: 'REFUNDED',
        updatedAt: new Date(),
      }).where(eq(orders.id, intent.orderId))
    }
  }

  // ──────────────────────────────────────────────────────────────────────────

  private async recordEvent(args: RecordEventArgs) {
    const [row] = await this.db.client.insert(paymentEvents).values({
      provider: 'PAYSTACK',
      eventType: args.eventType,
      reference: args.reference ?? null,
      intentId: args.intentId ?? null,
      orderId: args.orderId ?? null,
      amount: args.amount != null ? String(args.amount) : null,
      currency: args.currency ?? null,
      status: args.status ?? null,
      rawPayload: args.rawPayload as any,
      signatureValid: args.signatureValid,
      source: args.source,
      webhookId: args.webhookId ?? null,
    }).returning()
    return row
  }

  private async markEventProcessed(eventId: string, error: string | null) {
    await this.db.client.update(paymentEvents)
      .set({ processedAt: new Date(), processingError: error })
      .where(eq(paymentEvents.id, eventId))
  }

  private async applyOutcome(intentId: string, eventType: string, data: any, eventId: string) {
    // Dispute lifecycle: charge.dispute.create | charge.dispute.remind | charge.dispute.resolve
    if (/^charge\.dispute\./.test(eventType)) {
      const phase = eventType.split('.').pop() as 'create' | 'remind' | 'resolve'
      const rawStatus = String(data?.status ?? '').toLowerCase()
      const disputeStatus =
        phase === 'resolve' ? (rawStatus || 'resolved') :
        phase === 'create'  ? (rawStatus || 'pending') :
        (rawStatus || 'awaiting-merchant-feedback')

      const [intent] = await this.db.client.select().from(paymentIntents).where(eq(paymentIntents.id, intentId))
      const merged = { ...(intent?.metadata ?? {}), lastDispute: { phase, ...data } }
      await this.db.client.update(paymentIntents).set({
        disputeStatus,
        disputeUpdatedAt: new Date(),
        metadata: merged,
        lastEventId: eventId,
        updatedAt: new Date(),
      }).where(eq(paymentIntents.id, intentId))

      // If resolved with a refund, surface the refund amount too (Paystack includes it on `data.refund_amount`).
      const refundAmountKobo = Number(data?.refund_amount ?? 0)
      if (phase === 'resolve' && refundAmountKobo > 0) {
        await this.applyRefundOutcome(intentId, refundAmountKobo / 100, 'processed', data)
      }
      return
    }

    // Refund lifecycle events live on a separate path — they don't change intent.status.
    if (/^refund\./.test(eventType)) {
      const amountMajor = typeof data?.amount === 'number' ? data.amount / 100 : 0
      const statusRaw = String(data?.status ?? eventType.replace(/^refund\./, '')).toLowerCase()
      const status = (['processed', 'failed', 'pending', 'processing'].includes(statusRaw) ? statusRaw : 'pending') as
        'processed' | 'failed' | 'pending' | 'processing'
      await this.applyRefundOutcome(intentId, amountMajor, status, data)
      // Mark pointer regardless so we keep a trace.
      await this.db.client.update(paymentIntents).set({
        lastEventId: eventId,
        updatedAt: new Date(),
      }).where(eq(paymentIntents.id, intentId))
      return
    }

    const isSuccess = /\.success$/.test(eventType) || /^verify\.success$/.test(eventType)
    const isFailed = /\.failed$/.test(eventType) || /^verify\.failed$/.test(eventType)
    const isAbandoned = /abandoned/i.test(eventType) || /^verify\.abandoned$/.test(eventType)

    const nextStatus: IntentStatus =
      isSuccess ? 'SUCCEEDED' :
      isFailed ? 'FAILED' :
      isAbandoned ? 'ABANDONED' :
      'PROCESSING'

    const channel = this.fromPaystackChannel(data?.channel)
    const metadata = {
      channel: data?.channel,
      paid_at: data?.paid_at ?? data?.paidAt ?? null,
      fees: data?.fees ?? null,
      authorization: data?.authorization ? {
        bank: data.authorization.bank,
        card_type: data.authorization.card_type,
        last4: data.authorization.last4,
        mobile_money_number: data.authorization.mobile_money_number,
      } : null,
    }

    await this.db.client.update(paymentIntents).set({
      status: nextStatus,
      channel,
      lastEventId: eventId,
      metadata,
      updatedAt: new Date(),
    }).where(eq(paymentIntents.id, intentId))

    if (isSuccess) {
      const [intent] = await this.db.client.select().from(paymentIntents).where(eq(paymentIntents.id, intentId))
      if (intent) {
        await this.db.client.update(orders).set({
          paymentStatus: 'PAID',
          paidAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(orders.id, intent.orderId))
      }
    } else if (isFailed) {
      const [intent] = await this.db.client.select().from(paymentIntents).where(eq(paymentIntents.id, intentId))
      if (intent) {
        // Only flip order to FAILED if it isn't already PAID by a parallel attempt.
        await this.db.client.update(orders).set({
          paymentStatus: 'FAILED',
          updatedAt: new Date(),
        }).where(and(eq(orders.id, intent.orderId), eq(orders.paymentStatus, 'PENDING')))
      }
    }
  }

  private normalizeStatus(_eventType: string, raw: unknown): 'SUCCESS' | 'FAILED' | 'PENDING' | null {
    const s = String(raw ?? '').toLowerCase()
    if (s === 'success') return 'SUCCESS'
    if (s === 'failed' || s === 'abandoned') return 'FAILED'
    if (s === 'pending' || s === 'ongoing') return 'PENDING'
    return null
  }

  private toPaystackChannel(c: IntentChannel): 'card' | 'mobile_money' | 'bank' | 'ussd' | 'qr' {
    switch (c) {
      case 'CARD': return 'card'
      case 'MOBILE_MONEY': return 'mobile_money'
      case 'BANK': return 'bank'
      case 'USSD': return 'ussd'
      case 'QR': return 'qr'
      default: return 'card'
    }
  }

  private fromPaystackChannel(c: string | undefined): IntentChannel {
    switch ((c ?? '').toLowerCase()) {
      case 'card': return 'CARD'
      case 'mobile_money': return 'MOBILE_MONEY'
      case 'bank': return 'BANK'
      case 'ussd': return 'USSD'
      case 'qr': return 'QR'
      default: return 'UNKNOWN'
    }
  }

  /** Stats for /cms/payments dashboard + health check. */
  async getStats() {
    const [last24h, pending, failed24h, oldestPending, openDisputes] = await Promise.all([
      this.db.client.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'SUCCEEDED')::int AS succeeded,
          COUNT(*) FILTER (WHERE status = 'FAILED')::int AS failed,
          COUNT(*) FILTER (WHERE status IN ('REQUIRES_AUTH', 'PROCESSING'))::int AS open,
          COALESCE(SUM(CASE WHEN status='SUCCEEDED' THEN amount ELSE 0 END), 0)::text AS revenue
        FROM payment_intents WHERE created_at >= now() - interval '24 hours'
      `),
      this.db.client.execute(sql`
        SELECT COUNT(*)::int AS n FROM payment_intents
        WHERE status IN ('REQUIRES_AUTH', 'PROCESSING') AND updated_at < now() - interval '10 minutes'
      `),
      this.db.client.execute(sql`
        SELECT COUNT(*)::int AS n FROM payment_events
        WHERE received_at >= now() - interval '24 hours' AND processing_error IS NOT NULL
      `),
      this.db.client.execute(sql`
        SELECT EXTRACT(EPOCH FROM (now() - MIN(updated_at)))::int AS seconds_old
        FROM payment_intents WHERE status IN ('REQUIRES_AUTH', 'PROCESSING')
      `),
      this.db.client.execute(sql`
        SELECT COUNT(*)::int AS n FROM payment_intents
        WHERE dispute_status IS NOT NULL AND dispute_status NOT IN ('resolved', 'declined')
      `),
    ])
    const a = (last24h as any)[0] ?? {}
    const stuck = Number(((pending as any)[0] ?? {}).n ?? 0)
    const errored = Number(((failed24h as any)[0] ?? {}).n ?? 0)
    const oldestSec = Number(((oldestPending as any)[0] ?? {}).seconds_old ?? 0)
    const disputes = Number(((openDisputes as any)[0] ?? {}).n ?? 0)
    return {
      last24h: {
        succeeded: Number(a.succeeded ?? 0),
        failed: Number(a.failed ?? 0),
        open: Number(a.open ?? 0),
        revenue: String(a.revenue ?? '0'),
      },
      stuckIntents: stuck,
      eventsWithErrors24h: errored,
      oldestPendingSeconds: oldestSec,
      openDisputes: disputes,
      circuitBreaker: this.paystack.breaker.snapshot(),
      mode: this.paystack.mode(),
    }
  }
}
