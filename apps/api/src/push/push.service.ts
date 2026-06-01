import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DbService } from '../db/db.service'
import { pushSubscriptions } from '@trendmarga/db'
import { eq } from 'drizzle-orm'

type WebPushSendResult = { sent: number; failed: number; pruned: number }

export type PushPayload = {
  title: string
  body: string
  url?: string
  icon?: string
  badge?: string
  tag?: string
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name)
  private webpush: any | null = null
  private vapidPublic: string | undefined
  private configured = false

  constructor(
    private readonly db: DbService,
    private readonly config: ConfigService,
  ) {
    const pub = this.config.get<string>('VAPID_PUBLIC_KEY')
    const priv = this.config.get<string>('VAPID_PRIVATE_KEY')
    const subject = this.config.get<string>('VAPID_SUBJECT') ?? 'mailto:ops@trendmarga.com'
    this.vapidPublic = pub
    if (pub && priv) {
      try {
        // Lazy-require so missing dep doesn't crash the API at boot.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        this.webpush = require('web-push')
        this.webpush.setVapidDetails(subject, pub, priv)
        this.configured = true
      } catch (err: any) {
        this.logger.warn(`web-push not installed: ${err?.message ?? err}`)
      }
    }
  }

  getVapidPublicKey() {
    return { publicKey: this.vapidPublic ?? null, configured: this.configured }
  }

  async subscribe(input: {
    endpoint: string
    p256dh: string
    auth: string
    userAgent?: string | null
  }) {
    const existing = await this.db.client.query.pushSubscriptions.findFirst({
      where: eq(pushSubscriptions.endpoint, input.endpoint),
    })
    if (existing) {
      await this.db.client
        .update(pushSubscriptions)
        .set({
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent ?? existing.userAgent ?? null,
          lastSeenAt: new Date(),
        })
        .where(eq(pushSubscriptions.id, existing.id))
      return { id: existing.id, status: 'updated' as const }
    }
    const [row] = await this.db.client
      .insert(pushSubscriptions)
      .values({
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
      })
      .returning()
    return { id: row.id, status: 'created' as const }
  }

  async unsubscribe(endpoint: string) {
    const existing = await this.db.client.query.pushSubscriptions.findFirst({
      where: eq(pushSubscriptions.endpoint, endpoint),
    })
    if (!existing) throw new NotFoundException('Subscription not found')
    await this.db.client.delete(pushSubscriptions).where(eq(pushSubscriptions.id, existing.id))
    return { ok: true }
  }

  /** Sends a push notification to every subscriber. Quietly removes 404/410 endpoints. */
  async broadcast(payload: PushPayload): Promise<WebPushSendResult> {
    if (!this.configured || !this.webpush) {
      return { sent: 0, failed: 0, pruned: 0 }
    }
    const rows = await this.db.client.query.pushSubscriptions.findMany()
    let sent = 0
    let failed = 0
    let pruned = 0
    const body = JSON.stringify(payload)
    await Promise.all(
      rows.map(async (s) => {
        try {
          await this.webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
          )
          sent++
        } catch (err: any) {
          const code = err?.statusCode ?? 0
          if (code === 404 || code === 410) {
            await this.db.client.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id))
            pruned++
          } else {
            failed++
            this.logger.warn(`push send failed (${code}): ${err?.message ?? err}`)
          }
        }
      }),
    )
    return { sent, failed, pruned }
  }
}
