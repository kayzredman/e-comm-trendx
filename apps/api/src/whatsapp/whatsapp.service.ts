import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { DbService } from '../db/db.service'
import { useDbAuthState, type DbAuthState } from './whatsapp-auth-state'
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import QRCode from 'qrcode'

type ConnState = 'disconnected' | 'pairing' | 'connecting' | 'connected'

interface LogEntry {
  ts: string
  level: 'info' | 'ok' | 'warn' | 'err'
  message: string
}

interface DayStats {
  sent: number
  delivered: number
  failed: number
  dayKey: string
}

/**
 * Singleton WhatsApp socket manager.
 *
 * - Loads persisted auth from Postgres on boot. If creds exist → auto-connect.
 * - Pairing: caller passes a phone number, we expose the 8-char code Baileys mints.
 * - Send queue with WHATSAPP_MIN_GAP_MS throttle (default 1 msg/sec).
 */
@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name)

  private sock: WASocket | null = null
  private auth: DbAuthState | null = null
  private connState: ConnState = 'disconnected'
  private connectedAt: Date | null = null
  private lastEventAt: Date | null = null
  private pairingCode: string | null = null
  private pairingFor: string | null = null
  private pairingExpiresAt: Date | null = null
  private qrDataUrl: string | null = null
  private qrExpiresAt: Date | null = null
  private lastError: string | null = null

  private readonly log: LogEntry[] = []
  private readonly LOG_MAX = 50

  private stats: DayStats = { sent: 0, delivered: 0, failed: 0, dayKey: this.dayKey() }

  private queue: Promise<unknown> = Promise.resolve()
  private lastSendAt = 0

  private inbound: ((msg: { fromPhone: string; text: string; messageId: string }) => Promise<void> | void) | null = null

  private readonly enabled = process.env.WHATSAPP_ENABLED === 'true' || process.env.WHATSAPP_ENABLED === '1'
  private readonly minGapMs = Number(process.env.WHATSAPP_MIN_GAP_MS ?? 1000)

  constructor(private readonly db: DbService) {}

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.log('WhatsApp disabled (set WHATSAPP_ENABLED=true to enable).')
      return
    }
    // Boot in background; never block API startup.
    void this.boot().catch((err) => {
      this.lastError = (err as Error).message
      this.logger.error(`WhatsApp boot failed: ${this.lastError}`)
      this.pushLog('err', `Boot failed: ${this.lastError}`)
    })
  }

  async onModuleDestroy() {
    try {
      this.sock?.end(undefined)
    } catch {
      /* ignore */
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  getStatus() {
    return {
      enabled: this.enabled,
      state: this.connState,
      connectedAt: this.connectedAt?.toISOString() ?? null,
      lastEventAt: this.lastEventAt?.toISOString() ?? null,
      phoneNumber: this.sock?.user?.id?.split(':')[0] ?? process.env.WHATSAPP_PHONE_NUMBER ?? null,
      accountName: this.sock?.user?.name ?? null,
      pairingCode: this.pairingCode,
      pairingFor: this.pairingFor,
      pairingExpiresAt: this.pairingExpiresAt?.toISOString() ?? null,
      qrDataUrl: this.qrDataUrl,
      qrExpiresAt: this.qrExpiresAt?.toISOString() ?? null,
      lastError: this.lastError,
      stats: { ...this.statsForToday() },
      queueDepth: 0,
      minGapMs: this.minGapMs,
    }
  }

  getRecentLog() {
    return [...this.log].reverse()
  }

  /**
   * Start pairing. If we're already connected this throws.
   * Phone number must be in E.164-without-plus form, e.g. "233241234567".
   */
  async startPairing(rawPhone: string): Promise<{ code: string; expiresInSec: number }> {
    if (!this.enabled) throw new BadRequestException('WhatsApp is disabled — set WHATSAPP_ENABLED=true and restart the API.')
    if (this.connState === 'connected') throw new BadRequestException('Already connected. Disconnect first to re-pair.')

    let phone = rawPhone.replace(/[^\d]/g, '')
    // Ghana-friendly normalization: 0XXXXXXXXX (10 digits) → 233XXXXXXXXX
    if (phone.length === 10 && phone.startsWith('0')) phone = '233' + phone.slice(1)
    if (phone.length < 11) throw new BadRequestException('Phone must include country code (e.g. 233551481853)')

    // Always tear down any existing socket and start fresh — avoids "Connection Closed"
    // if we're mid-reconnect or holding a stale socket from a previous logout.
    try {
      this.sock?.end(undefined)
    } catch {
      /* ignore */
    }
    this.sock = null
    if (this.auth) {
      await this.auth.clear().catch(() => undefined)
      this.auth = null
    }
    await this.boot()
    if (!this.sock) throw new ServiceUnavailableException('Socket not ready')

    // Baileys requires the WS handshake to complete before requestPairingCode.
    // A small delay is the canonical pattern from the Baileys docs.
    await new Promise((r) => setTimeout(r, 2500))

    const code = await this.sock.requestPairingCode(phone)
    const formatted = code.match(/.{1,4}/g)?.join('-') ?? code
    this.pairingCode = formatted
    this.pairingFor = phone
    this.pairingExpiresAt = new Date(Date.now() + 3 * 60_000)
    this.connState = 'pairing'
    this.pushLog('info', `Pairing code issued for +${phone}`)
    return { code: formatted, expiresInSec: 180 }
  }

  /**
   * Start QR pairing — wipes any stale auth, boots fresh, and the QR will be
   * exposed via getStatus().qrDataUrl as soon as Baileys emits it.
   */
  async startQrPairing(): Promise<{ ok: true }> {
    if (!this.enabled) throw new BadRequestException('WhatsApp is disabled — set WHATSAPP_ENABLED=true and restart the API.')
    if (this.connState === 'connected') throw new BadRequestException('Already connected. Disconnect first to re-pair.')

    try { this.sock?.end(undefined) } catch { /* ignore */ }
    this.sock = null
    if (this.auth) {
      await this.auth.clear().catch(() => undefined)
      this.auth = null
    }
    this.qrDataUrl = null
    this.qrExpiresAt = null
    await this.boot()
    this.pushLog('info', 'QR pairing started — waiting for QR…')
    return { ok: true }
  }

  async disconnect() {
    try {
      await this.sock?.logout()
    } catch (err) {
      this.logger.warn(`Logout error (continuing): ${(err as Error).message}`)
    }
    try {
      this.sock?.end(undefined)
    } catch {
      /* ignore */
    }
    this.sock = null
    this.connState = 'disconnected'
    this.connectedAt = null
    this.pairingCode = null
    this.pairingFor = null
    this.pairingExpiresAt = null
    if (this.auth) await this.auth.clear()
    this.auth = null
    this.pushLog('warn', 'Disconnected — auth state wiped')
    return { ok: true }
  }

  /** True if a message can be sent right now. */
  isReady(): boolean {
    return this.enabled && this.connState === 'connected' && this.sock !== null
  }

  /**
   * Register a handler for inbound text messages from real users (not self / not status@broadcast).
   * Only one handler is supported — last registration wins.
   */
  setInboundHandler(handler: (msg: { fromPhone: string; text: string; messageId: string }) => Promise<void> | void) {
    this.inbound = handler
  }

  /**
   * Send a text message. Returns providerId on success.
   * Throttled by WHATSAPP_MIN_GAP_MS. Throws if not connected.
   */
  async sendText(to: string, body: string): Promise<{ providerId: string }> {
    if (!this.isReady()) throw new ServiceUnavailableException('WhatsApp not connected')
    const jid = toJid(to)
    return this.enqueue(async () => {
      const res = await this.sock!.sendMessage(jid, { text: body })
      const id = res?.key?.id ?? 'unknown'
      this.bumpStat('sent')
      this.pushLog('ok', `Sent → ${to} (${id})`)
      return { providerId: id }
    }).catch((err: Error) => {
      this.bumpStat('failed')
      this.pushLog('err', `Failed → ${to}: ${err.message}`)
      throw err
    })
  }

  // ─── Internals ───────────────────────────────────────────────────────────

  private async boot() {
    this.auth = await useDbAuthState(this.db)
    const { version } = await fetchLatestBaileysVersion()

    this.sock = makeWASocket({
      version,
      auth: this.auth.state,
      logger: pino({ level: 'silent' }) as never,
      printQRInTerminal: false,
      browser: Browsers.macOS('Safari'),
      syncFullHistory: false,
      markOnlineOnConnect: false,
    })

    this.connState = this.auth.state.creds.registered ? 'connecting' : 'pairing'
    this.lastError = null

    this.sock.ev.on('creds.update', () => this.auth?.saveCreds())

    this.sock.ev.on('connection.update', (u) => {
      this.lastEventAt = new Date()
      const { connection, lastDisconnect, qr } = u

      if (qr) {
        void QRCode.toDataURL(qr, { width: 320, margin: 1 })
          .then((dataUrl) => {
            this.qrDataUrl = dataUrl
            this.qrExpiresAt = new Date(Date.now() + 60_000)
            this.connState = 'pairing'
            this.pushLog('info', 'QR code refreshed — scan within 60s')
          })
          .catch((err) => this.pushLog('err', `QR render failed: ${(err as Error).message}`))
      }

      if (connection === 'open') {
        this.connState = 'connected'
        this.connectedAt = new Date()
        this.pairingCode = null
        this.pairingFor = null
        this.pairingExpiresAt = null
        this.qrDataUrl = null
        this.qrExpiresAt = null
        this.lastError = null
        this.pushLog('ok', `Connected as ${this.sock?.user?.id ?? '?'}`)
      } else if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode
        const reason = DisconnectReason[statusCode ?? 0] ?? `code ${statusCode ?? '?'}`
        this.connState = 'disconnected'
        this.connectedAt = null
        this.lastError = reason
        this.pushLog('warn', `Disconnected: ${reason}`)

        // Only auto-reconnect if it wasn't a logout (auth still valid).
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut
        if (shouldReconnect && this.enabled) {
          this.pushLog('info', 'Reconnecting in 3s…')
          setTimeout(() => {
            this.boot().catch((err) => {
              this.lastError = (err as Error).message
              this.pushLog('err', `Reconnect failed: ${this.lastError}`)
            })
          }, 3000)
        } else if (statusCode === DisconnectReason.loggedOut) {
          // Wipe stale creds so next pair attempt starts fresh.
          void this.auth?.clear().then(() => {
            this.auth = null
            this.sock = null
            this.pushLog('warn', 'Logged out — auth state wiped, ready to re-pair')
          })
        }
      }
    })

    this.sock.ev.on('messages.update', (updates) => {
      for (const u of updates) {
        // status: 3 = delivered, 4 = read
        if (u.update.status && u.update.status >= 3) this.bumpStat('delivered')
      }
    })

    this.sock.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return
      for (const m of messages) {
        if (!m.message || m.key.fromMe) continue
        const jid = m.key.remoteJid ?? ''
        // Direct user chats only: legacy phone JID OR new privacy LID. Skip groups / broadcasts / newsletters.
        if (!jid.endsWith('@s.whatsapp.net') && !jid.endsWith('@lid')) continue
        const text =
          m.message.conversation ??
          m.message.extendedTextMessage?.text ??
          m.message.imageMessage?.caption ??
          ''
        if (!text.trim()) continue
        // For LID messages the JID is the reply target; for phone JIDs it doubles as the phone.
        const fromPhone = jid
        const handler = this.inbound
        if (!handler) continue
        Promise.resolve(handler({ fromPhone, text: text.trim(), messageId: m.key.id ?? '' }))
          .catch((err: Error) => this.pushLog('err', `Inbound handler failed: ${err.message}`))
      }
    })
  }

  private async enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = async () => {
      const gap = this.minGapMs - (Date.now() - this.lastSendAt)
      if (gap > 0) await new Promise((r) => setTimeout(r, gap))
      this.lastSendAt = Date.now()
      return task()
    }
    const next = this.queue.then(run, run)
    this.queue = next.catch(() => undefined)
    return next as Promise<T>
  }

  /** Resolve when the Baileys WebSocket is open, or reject after timeoutMs. */
  private waitForWsOpen(timeoutMs: number): Promise<void> {
    const ws = (this.sock as unknown as { ws?: { readyState?: number } })?.ws
    if (ws?.readyState === 1) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.sock?.ev.off('connection.update', onUpdate)
        reject(new ServiceUnavailableException('Timed out waiting for WhatsApp socket to open'))
      }, timeoutMs)
      const onUpdate = (u: { connection?: string }) => {
        if (u.connection === 'open' || u.connection === 'connecting') {
          const wsNow = (this.sock as unknown as { ws?: { readyState?: number } })?.ws
          if (wsNow?.readyState === 1) {
            clearTimeout(timer)
            this.sock?.ev.off('connection.update', onUpdate)
            resolve()
          }
        }
      }
      this.sock?.ev.on('connection.update', onUpdate)
    })
  }

  private pushLog(level: LogEntry['level'], message: string) {
    this.log.push({ ts: new Date().toISOString(), level, message })
    if (this.log.length > this.LOG_MAX) this.log.shift()
  }

  private dayKey() {
    return new Date().toISOString().slice(0, 10)
  }

  private statsForToday() {
    if (this.stats.dayKey !== this.dayKey()) {
      this.stats = { sent: 0, delivered: 0, failed: 0, dayKey: this.dayKey() }
    }
    return this.stats
  }

  private bumpStat(k: 'sent' | 'delivered' | 'failed') {
    const s = this.statsForToday()
    s[k] += 1
  }
}

/** "+233 24 555 0142" or "0245550142" → "233245550142@s.whatsapp.net". Pass-through if already a JID. */
function toJid(phone: string): string {
  // Already a JID (e.g. inbound reply target like "206927296475323@lid" or "233...@s.whatsapp.net")
  if (phone.includes('@')) return phone
  let digits = phone.replace(/[^\d]/g, '')
  // Ghana-friendly: 10-digit local (0XXXXXXXXX) → 233XXXXXXXXX
  if (digits.length === 10 && digits.startsWith('0')) digits = '233' + digits.slice(1)
  return `${digits}@s.whatsapp.net`
}
