import { Injectable, Logger } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { notificationLog } from '@trendmarga/db'
import { eq } from 'drizzle-orm'
import { features } from '@trendmarga/config'
import { sendSms } from './providers/hubtel.provider'
import { sendEmail } from './providers/resend.provider'
import { templates, type TemplateName, type OrderTemplateData } from './templates'

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

  constructor(private readonly db: DbService) {}

  /**
   * Fire-and-forget dispatch. No-ops when FEATURE_NOTIFICATIONS is disabled.
   * In production this should be replaced with a BullMQ queue job.
   */
  async dispatch(input: DispatchInput): Promise<void> {
    if (!features.notifications) return

    const built = templates[input.template](input.data)

    // SMS leg
    if (input.phone && built.sms) {
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

  private async send(opts: {
    channel: 'SMS' | 'EMAIL'
    template: string
    recipient: string
    orderId?: string
    customerId?: string
    payload: Record<string, unknown>
    send: () => Promise<{ providerId: string }>
  }) {
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.error(`[notif:${opts.channel}] ${opts.template} -> ${opts.recipient}: ${msg}`)
      await this.db.client.update(notificationLog)
        .set({ status: 'FAILED', errorMessage: msg })
        .where(eq(notificationLog.id, row.id))
    }
  }
}
