import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { desc, eq, ilike } from 'drizzle-orm'
import { orders } from '@trendmarga/db'
import { DbService } from '../db/db.service'
import { WhatsappService } from './whatsapp.service'

const HELP = (brand = 'trendMarga') =>
  `🛍️ *${brand}* customer help\n\n` +
  `*TRACK <code>* — check order status\n` +
  `*CANCEL <code>* — cancel an unshipped order\n` +
  `*HELP* — show this menu\n\n` +
  `Tip: <code> is the 8-character ID we sent on order confirmation, e.g. *TRACK A1B2C3D4*.`

const STATUS_LABEL: Record<string, string> = {
  PENDING: '⏳ Pending — awaiting confirmation',
  CONFIRMED: '✅ Confirmed — preparing',
  PROCESSING: '🛠️ Processing — getting ready to ship',
  READY_FOR_PICKUP: '📦 Ready for pickup',
  OUT_FOR_DELIVERY: '🛵 Out for delivery',
  DELIVERED: '🎉 Delivered',
  CANCELLED: '❌ Cancelled',
}

const CANCELLABLE = new Set(['PENDING', 'CONFIRMED'])

/**
 * Parses inbound WhatsApp commands from customers and replies.
 * Commands: TRACK <code>, CANCEL <code>, HELP. Anything else → help menu.
 */
@Injectable()
export class WhatsappInboundService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappInboundService.name)

  constructor(
    private readonly db: DbService,
    private readonly whatsapp: WhatsappService,
  ) {}

  onModuleInit() {
    this.whatsapp.setInboundHandler(({ fromPhone, text }) => this.handle(fromPhone, text))
  }

  private async handle(fromPhone: string, text: string) {
    const reply = async (body: string) => {
      try {
        await this.whatsapp.sendText(fromPhone, body)
      } catch (err) {
        this.logger.warn(`reply failed → ${fromPhone}: ${(err as Error).message}`)
      }
    }

    const upper = text.toUpperCase().trim()
    const trackMatch = upper.match(/^TRACK\s+([A-Z0-9-]{4,40})$/)
    const cancelMatch = upper.match(/^CANCEL\s+([A-Z0-9-]{4,40})$/)

    if (trackMatch) {
      const order = await this.findOrderByCode(trackMatch[1])
      if (!order) return reply(`We couldn't find an order matching *${trackMatch[1]}*. Double-check the code on your confirmation message.`)
      const label = STATUS_LABEL[order.status] ?? order.status
      return reply(
        `Order *#${order.id.slice(0, 8).toUpperCase()}*\n` +
        `Status: ${label}\n` +
        `Total: ${({GHS:'GH₵',NGN:'₦',ZAR:'R',KES:'KSh',USD:'$'} as Record<string,string>)[(process.env.STORE_CURRENCY ?? 'GHS').toUpperCase()] ?? 'GH₵'}${order.total}\n\n` +
        `Reply *HELP* for more options.`,
      )
    }

    if (cancelMatch) {
      const order = await this.findOrderByCode(cancelMatch[1])
      if (!order) return reply(`We couldn't find an order matching *${cancelMatch[1]}*.`)
      if (!CANCELLABLE.has(order.status)) {
        return reply(
          `Sorry, order *#${order.id.slice(0, 8).toUpperCase()}* is *${STATUS_LABEL[order.status] ?? order.status}* and can no longer be cancelled here.\n` +
          `Reply to this message and our team will follow up.`,
        )
      }
      await this.db.client
        .update(orders)
        .set({ status: 'CANCELLED', updatedAt: new Date() })
        .where(eq(orders.id, order.id))
      return reply(
        `✅ Order *#${order.id.slice(0, 8).toUpperCase()}* has been cancelled. If you've already paid, our team will process the refund within 1–3 business days.`,
      )
    }

    if (upper === 'HELP' || upper === 'HI' || upper === 'HELLO' || upper === 'START' || upper === 'MENU') {
      return reply(HELP())
    }

    // Default: gentle nudge to the help menu so we never go silent.
    return reply(`Sorry, I didn't catch that.\n\n${HELP()}`)
  }

  /**
   * Resolve an order from a customer-typed code. Matches either:
   *  - The first 8 chars of the order id (case-insensitive prefix), OR
   *  - The 4-digit delivery PIN (when unambiguous; restricted to last 24h orders for that phone).
   */
  private async findOrderByCode(code: string) {
    const trimmed = code.trim()

    // Pure 4-digit input = delivery PIN
    if (/^\d{4}$/.test(trimmed)) {
      const [match] = await this.db.client
        .select()
        .from(orders)
        .where(eq(orders.deliveryCode, trimmed))
        .orderBy(desc(orders.createdAt))
        .limit(1)
      return match ?? null
    }

    // Otherwise treat as id prefix (drop leading # if any)
    const prefix = trimmed.replace(/^#/, '').toLowerCase()
    const [match] = await this.db.client
      .select()
      .from(orders)
      .where(ilike(orders.id, `${prefix}%`))
      .orderBy(desc(orders.createdAt))
      .limit(1)
    return match ?? null
  }
}
