import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import * as crypto from 'node:crypto'
import { CircuitBreaker } from './circuit-breaker'

export interface PaystackInitArgs {
  email: string
  amountKobo: number          // Paystack expects integer minor units
  currency: string            // 'GHS'
  reference: string
  callbackUrl?: string
  channels?: Array<'card' | 'mobile_money' | 'bank' | 'ussd' | 'qr'>
  metadata?: Record<string, unknown>
}

export interface PaystackInitResponse {
  authorization_url: string
  access_code: string
  reference: string
}

export interface PaystackVerifyResponse {
  reference: string
  status: 'success' | 'failed' | 'abandoned' | 'pending' | string
  amount: number              // minor units
  currency: string
  channel: string             // 'card' | 'mobile_money' | 'bank' | …
  paid_at: string | null
  customer: { email?: string }
  fees: number | null
  raw: Record<string, unknown>
}

class PaystackError extends Error {
  constructor(message: string, public readonly status: number, public readonly body?: unknown) {
    super(message)
  }
}

/**
 * Thin Paystack REST wrapper.
 *
 * - 8s timeout per call (AbortSignal.timeout)
 * - 1 retry on network/5xx, none on 4xx
 * - circuit breaker tracks failures across calls
 * - signature verifier uses HMAC-SHA512 of the raw body
 */
@Injectable()
export class PaystackClient {
  private readonly logger = new Logger(PaystackClient.name)
  readonly breaker = new CircuitBreaker('paystack-api')

  private readonly base = process.env.PAYSTACK_API_BASE ?? 'https://api.paystack.co'
  private readonly secret = process.env.PAYSTACK_SECRET_KEY ?? ''

  isConfigured(): boolean {
    return Boolean(this.secret) && this.secret.startsWith('sk_')
  }

  mode(): 'test' | 'live' | 'unconfigured' {
    if (!this.isConfigured()) return 'unconfigured'
    return this.secret.startsWith('sk_live_') ? 'live' : 'test'
  }

  async initializeTransaction(args: PaystackInitArgs): Promise<PaystackInitResponse> {
    const body = {
      email: args.email,
      amount: args.amountKobo,
      currency: args.currency,
      reference: args.reference,
      callback_url: args.callbackUrl,
      channels: args.channels,
      metadata: args.metadata,
    }
    const data = await this.request<{ status: boolean; message: string; data: PaystackInitResponse }>(
      'POST', '/transaction/initialize', body,
    )
    return data.data
  }

  async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    const data = await this.request<{ status: boolean; data: Record<string, any> }>(
      'GET', `/transaction/verify/${encodeURIComponent(reference)}`,
    )
    const d = data.data ?? {}
    return {
      reference: String(d.reference ?? reference),
      status: String(d.status ?? 'pending'),
      amount: Number(d.amount ?? 0),
      currency: String(d.currency ?? 'GHS'),
      channel: String(d.channel ?? 'unknown'),
      paid_at: d.paid_at ?? d.paidAt ?? null,
      customer: { email: d.customer?.email },
      fees: typeof d.fees === 'number' ? d.fees : null,
      raw: d,
    }
  }

  /** Liveness probe — uses /bank which is cheap and stable. */
  async ping(): Promise<{ ok: true; latencyMs: number }> {
    const t0 = Date.now()
    await this.request<unknown>('GET', '/bank?country=ghana&perPage=1', undefined, { skipBreaker: true })
    return { ok: true, latencyMs: Date.now() - t0 }
  }

  /**
   * Paystack signs each webhook with HMAC-SHA512 using the secret key.
   * The signature is over the exact request body bytes. Re-serializing JSON
   * works because Paystack sends compact, sorted JSON.
   */
  verifySignature(rawBodyOrJson: string | object, signatureHeader: string | undefined): boolean {
    if (!this.secret || !signatureHeader) return false
    const body = typeof rawBodyOrJson === 'string' ? rawBodyOrJson : JSON.stringify(rawBodyOrJson)
    const computed = crypto.createHmac('sha512', this.secret).update(body).digest('hex')
    try {
      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signatureHeader))
    } catch {
      return false
    }
  }

  // ──────────────────────────────────────────────────────────────────────────

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    opts: { skipBreaker?: boolean } = {},
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Paystack not configured (missing PAYSTACK_SECRET_KEY)')
    }
    if (!opts.skipBreaker && !this.breaker.canCall()) {
      throw new ServiceUnavailableException('Paystack circuit breaker is OPEN')
    }

    const url = `${this.base}${path}`
    let lastErr: unknown
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${this.secret}`,
            'Content-Type': 'application/json',
            'User-Agent': 'trendmarga-api/1.0',
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(8000),
        })
        const text = await res.text()
        let parsed: any
        try { parsed = text ? JSON.parse(text) : {} } catch { parsed = { raw: text } }

        if (!res.ok) {
          // 4xx → final, no retry; 5xx → retry once
          if (res.status >= 400 && res.status < 500) {
            const err = new PaystackError(
              `Paystack ${res.status}: ${parsed?.message ?? text.slice(0, 200)}`,
              res.status, parsed,
            )
            if (!opts.skipBreaker) this.breaker.recordFailure(err)
            throw err
          }
          throw new PaystackError(`Paystack ${res.status}`, res.status, parsed)
        }

        if (!opts.skipBreaker) this.breaker.recordSuccess()
        return parsed as T
      } catch (err) {
        lastErr = err
        if (err instanceof PaystackError && err.status >= 400 && err.status < 500) {
          throw err
        }
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 250))
          continue
        }
        if (!opts.skipBreaker) this.breaker.recordFailure(err)
        this.logger.warn(`Paystack ${method} ${path} failed: ${(err as Error)?.message}`)
        throw err
      }
    }
    throw lastErr as Error
  }
}
