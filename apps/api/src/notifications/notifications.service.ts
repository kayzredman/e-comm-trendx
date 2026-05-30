import { Injectable, Logger } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { notificationLog } from '@trendmarga/db'
import { eq } from 'drizzle-orm'
import { features } from '@trendmarga/config'
import { sendSms } from './providers/hubtel.provider'
import { sendEmail } from './providers/resend.provider'
import { templates, type TemplateName, type OrderTemplateData } from './templates'
import { WhatsappService } from '../whatsapp/whatsapp.service'

type DispatchInput = {
  template: TemplateName
  data: OrderTemplateData
  orderId?: string
  customerId?: string
  phone?: string
  email?: string
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    private readonly db: DbService,
    private readonly whatsapp: WhatsappService,
  ) {}

  /**
   * Fire-and-forget dispatch. No-ops when FEATURE_NOTIFICATIONS is disabled.
   * Channel preference for phone-based delivery: WhatsApp (if connected) → SMS fallback.
   */
  async dispatch(input: DispatchInput): Promise<void> {
    if (!features.notifications) return

    const built = templates[input.template](input.data)

    // Phone leg — WhatsApp first, SMS fallback. Each is logged separately.
    if (input.phone) {
      let waSent = false
      if (built.whatsapp && this.whatsapp.isReady()) {
        waSent = await this.send({
          channel: 'WHATSAPP',
          template: input.template,
          recipient: input.phone,
          orderId: input.orderId,
          customerId: input.customerId,
          payload: { body: built.whatsapp },
          send: () => this.whatsapp.sendText(input.phone!, built.whatsapp!),
        })
      }
      if (!waSent && built.sms) {
        await this.send({
          channel: 'SMS',
          template: input.template,
          recipient: input.phone,
          orderId: input.orderId,
          customerId: input.customerId,
          payload: { body: built.sms },
          send: () => sendSms(input.phone!, built.sms),
        })
      }
    }

    // Email leg
    if (input.email && built.email) {
      await this.send({
        channel: 'EMAIL',
        template: input.template,
        recipient: input.email,
        orderId: input.orderId,
        customerId: input.customerId,
        payload: built.email,
        send: () => sendEmail(input.email!, built.email.subject, built.email.html),
      })
    }
  }

  /** Returns true on success, false on failure (so callers can fall back). */
  private async send(opts: {
    channel: 'SMS' | 'EMAIL' | 'WHATSAPP'
    template: string
    recipient: string
    orderId?: string
    customerId?: string
    payload: Record<string, unknown>
    send: () => Promise<{ providerId: string }>
  }): Promise<boolean> {
    const [row] = await this.db.client.insert(notificationLog).values({
      orderId: opts.orderId,
      customerId: opts.customerId,
      channel: opts.channel,
      template: opts.template,
      recipient: opts.recipient,
      status: 'QUEUED',
      payload: opts.payload,
    }).returning()

    try {
      const { providerId } = await opts.send()
      await this.db.client.update(notificationLog)
        .set({ status: 'SENT', providerId, sentAt: new Date() })
        .where(eq(notificationLog.id, row.id))
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(`[notif:${opts.channel}] ${opts.template} -> ${opts.recipient}: ${msg}`)
      await this.db.client.update(notificationLog)
        .set({ status: 'FAILED', errorMessage: msg })
        .where(eq(notificationLog.id, row.id))
      return false
    }
  }
}
