import { auth } from '@clerk/nextjs/server'
import WhatsappManager from './WhatsappManager'

export const dynamic = 'force-dynamic'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'

export type WhatsappStatus = {
  enabled: boolean
  state: 'disconnected' | 'pairing' | 'connecting' | 'connected'
  connectedAt: string | null
  lastEventAt: string | null
  phoneNumber: string | null
  accountName: string | null
  pairingCode: string | null
  pairingFor: string | null
  pairingExpiresAt: string | null
  lastError: string | null
  stats: { sent: number; delivered: number; failed: number; dayKey: string }
  queueDepth: number
  minGapMs: number
}

export type LogEntry = { ts: string; level: 'info' | 'ok' | 'warn' | 'err'; message: string }

export default async function WhatsappPage() {
  const { getToken } = await auth()
  const token = await getToken()

  let initialStatus: WhatsappStatus | null = null
  let initialLog: LogEntry[] = []
  try {
    if (token) {
      const [s, l] = await Promise.all([
        fetch(`${API}/whatsapp/status`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }).then((r) => r.ok ? r.json() : null),
        fetch(`${API}/whatsapp/log`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }).then((r) => r.ok ? r.json() : { entries: [] }),
      ])
      initialStatus = s
      initialLog = l?.entries ?? []
    }
  } catch { /* API offline */ }

  return (
    <div className="p-4 md:p-8 max-w-450 mx-auto" style={{ minHeight: '100vh', background: 'var(--color-page)' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--color-text)' }}>
          WhatsApp
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Send courier OTPs and customer notifications over WhatsApp via Baileys. Falls back to SMS when offline.
        </p>
      </div>
      <WhatsappManager initialStatus={initialStatus} initialLog={initialLog} />
    </div>
  )
}
