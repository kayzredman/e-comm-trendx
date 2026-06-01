import {
  Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { PaymentsService } from './payments.service'
import { PaystackClient } from './paystack.client'
import { ClerkGuard } from '../auth/clerk.guard'
import { Public } from '../auth/public.decorator'

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly paystack: PaystackClient,
  ) {}

  // ── Storefront-facing ────────────────────────────────────────────────────

  /**
   * Init or resume a Paystack intent for an order. Storefront calls this
   * after `POST /v1/orders` returns and the user picks card/MoMo.
   */
  @Public()
  @Post('v1/payments/init')
  async init(@Body() body: { orderId: string; channel?: 'CARD' | 'MOBILE_MONEY' | 'BANK' }) {
    const intent = await this.payments.initIntent(body.orderId, { channel: body.channel })
    return {
      reference: intent.providerReference,
      authorizationUrl: intent.authorizationUrl,
      accessCode: intent.accessCode,
      status: intent.status,
    }
  }

  /** Public reference lookup — used by the /checkout/return page. */
  @Public()
  @Get('v1/payments/:reference')
  async lookup(@Param('reference') reference: string) {
    const intent = await this.payments.findIntentByReference(reference)
    if (!intent) return { found: false }
    return {
      found: true,
      reference: intent.providerReference,
      status: intent.status,
      orderId: intent.orderId,
      amount: intent.amount,
      currency: intent.currency,
      channel: intent.channel,
    }
  }

  // ── Webhook ──────────────────────────────────────────────────────────────

  /**
   * Paystack webhook. Persists raw payload + signature validity, returns 200
   * even on processing errors so Paystack doesn't bombard us with retries —
   * failed events stay queryable and replay-able from /cms/payments.
   */
  @Public()
  @Post('v1/webhooks/paystack')
  async webhook(
    @Req() req: FastifyRequest,
    @Headers('x-paystack-signature') signature: string,
  ) {
    const result = await this.payments.handleWebhook(req.body, signature)
    return result
  }

  // ── CMS (authenticated) ──────────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(ClerkGuard)
  @Get('cms/payments/stats')
  stats() { return this.payments.getStats() }

  @ApiBearerAuth()
  @UseGuards(ClerkGuard)
  @Get('cms/payments/intents')
  intents(@Query('status') status?: any, @Query('limit') limit?: string) {
    return this.payments.listIntents({
      status: status as any,
      limit: limit ? Number(limit) : undefined,
    })
  }

  @ApiBearerAuth()
  @UseGuards(ClerkGuard)
  @Get('cms/payments/events')
  events(
    @Query('reference') reference?: string,
    @Query('intentId') intentId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.payments.listEvents({
      reference, intentId,
      limit: limit ? Number(limit) : undefined,
    })
  }

  @ApiBearerAuth()
  @UseGuards(ClerkGuard)
  @Post('cms/payments/events/:id/replay')
  replay(@Param('id') id: string) { return this.payments.replayEvent(id) }

  @ApiBearerAuth()
  @UseGuards(ClerkGuard)
  @Post('cms/payments/reconcile')
  async reconcile() { return this.payments.reconcileStuck(10) }

  @ApiBearerAuth()
  @UseGuards(ClerkGuard)
  @Get('cms/payments/config')
  config() {
    return {
      mode: this.paystack.mode(),
      publicKey: process.env.PAYSTACK_PUBLIC_KEY ?? null,
      enabled: process.env.PAYSTACK_ENABLED === 'true',
      callbackUrl: process.env.PAYSTACK_CALLBACK_URL
        ?? (process.env.WEB_URL ? `${process.env.WEB_URL}/checkout/return` : null),
      webhookUrl: '/v1/webhooks/paystack',
      circuitBreaker: this.paystack.breaker.snapshot(),
    }
  }
}
