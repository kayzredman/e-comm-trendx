'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { CheckCircle2, AlertCircle, Loader2, Power, QrCode, RefreshCw, Send, Smartphone, Wifi, WifiOff } from 'lucide-react'
import type { WhatsappStatus, LogEntry } from './page'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'

type Props = {
  initialStatus: WhatsappStatus | null
  initialLog: LogEntry[]
}

export default function WhatsappManager({ initialStatus, initialLog }: Props) {
  const { getToken } = useAuth()
  const [status, setStatus] = useState<WhatsappStatus | null>(initialStatus)
  const [log, setLog] = useState<LogEntry[]>(initialLog)
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState<'pair' | 'qr' | 'disconnect' | 'test' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'qr' | 'code'>('qr')
  const [testTo, setTestTo] = useState('')
  const [testBody, setTestBody] = useState('Hello from trendMarga')

  const refresh = useCallback(async () => {
    try {
      const t = await getToken()
      if (!t) return
      const [s, l] = await Promise.all([
        fetch(`${API}/whatsapp/status`, { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' }).then((r) => r.ok ? r.json() : null),
        fetch(`${API}/whatsapp/log`, { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' }).then((r) => r.ok ? r.json() : { entries: [] }),
      ])
      if (s) setStatus(s)
      if (l?.entries) setLog(l.entries)
    } catch { /* swallow */ }
  }, [getToken])

  // Poll every 5s.
  useEffect(() => {
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [refresh])

  const action = async (kind: 'pair' | 'qr' | 'disconnect' | 'test', body?: unknown) => {
    setBusy(kind); setError(null)
    try {
      const t = await getToken()
      const path =
        kind === 'pair' ? '/whatsapp/pair'
        : kind === 'qr' ? '/whatsapp/qr'
        : kind === 'disconnect' ? '/whatsapp/disconnect'
        : '/whatsapp/test'
      const res = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({ message: res.statusText }))).message ?? res.statusText)
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  if (!status) {
    return <div className="rounded-xl p-6 text-sm" style={{ background: '#fff', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>API offline or WhatsApp module unreachable.</div>
  }

  if (!status.enabled) {
    return (
      <div className="rounded-xl p-6" style={{ background: '#FEF3C7', border: '1px solid #F59E0B' }}>
        <div className="font-bold mb-2" style={{ color: '#92400E' }}>WhatsApp module is disabled</div>
        <div className="text-sm" style={{ color: '#78350F' }}>
          Set <code className="bg-white/60 px-1.5 py-0.5 rounded">WHATSAPP_ENABLED=true</code> in your API environment and restart, then return here to pair.
        </div>
      </div>
    )
  }

  const connected = status.state === 'connected'

  return (
    <div className="grid gap-4 md:gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>

      {/* ─── Connection card ─── */}
      <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Connection</div>
          <StatusBadge state={status.state} />
        </div>

        {connected ? (
          <div className="space-y-2.5">
            <Row label="Account" value={status.accountName ?? '—'} />
            <Row label="Phone number" value={status.phoneNumber ? `+${status.phoneNumber}` : '—'} mono />
            <Row label="Connected" value={status.connectedAt ? new Date(status.connectedAt).toLocaleString() : '—'} />
            <Row label="Last event" value={status.lastEventAt ? timeAgo(status.lastEventAt) : '—'} />
            <button
              type="button"
              disabled={busy === 'disconnect'}
              onClick={() => { if (confirm('Disconnect WhatsApp? You will need to re-pair on the phone.')) action('disconnect') }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: '#fff', color: '#DC2626', border: '1px solid #FECACA' }}
            >
              {busy === 'disconnect' ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
              Disconnect
            </button>
          </div>
        ) : status.state === 'pairing' && status.qrDataUrl ? (
          <QrDisplay status={status} onRefresh={() => action('qr')} busy={busy === 'qr'} />
        ) : status.state === 'pairing' && status.pairingCode ? (
          <PairingDisplay status={status} />
        ) : (
          <>
            <ModeTabs mode={mode} setMode={setMode} />
            {mode === 'qr' ? (
              <QrStart onStart={() => action('qr')} busy={busy === 'qr'} />
            ) : (
              <PairForm
                phone={phone}
                onPhoneChange={setPhone}
                onSubmit={() => action('pair', { phone })}
                busy={busy === 'pair'}
              />
            )}
          </>
        )}

        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: '#DC2626' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
        {status.lastError && !error && (
          <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <AlertCircle size={12} /> Last error: {status.lastError}
          </div>
        )}
      </div>

      {/* ─── Stats card ─── */}
      <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
        <div className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>Today</div>
        <div className="grid grid-cols-3 gap-2">
          <Stat n={status.stats.sent} label="Sent" />
          <Stat n={status.stats.delivered} label="Delivered" />
          <Stat n={status.stats.failed} label="Failed" tone={status.stats.failed > 0 ? 'red' : 'muted'} />
        </div>
        <div className="mt-4 pt-3 text-xs flex items-center justify-between" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}>
          <span>Rate cap · {Math.round(1000 / status.minGapMs * 60)} msg/min</span>
          <button type="button" onClick={refresh} className="inline-flex items-center gap-1 hover:underline">
            <RefreshCw size={11} /> Refresh
          </button>
        </div>

        {connected && (
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Send test message</div>
            <input
              type="text"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="+233 24 555 0142"
              className="w-full px-3 py-2 rounded-lg text-sm mb-2"
              style={{ border: '1px solid var(--color-border)' }}
            />
            <textarea
              value={testBody}
              onChange={(e) => setTestBody(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm mb-2"
              style={{ border: '1px solid var(--color-border)' }}
            />
            <button
              type="button"
              disabled={busy === 'test' || !testTo || !testBody}
              onClick={() => action('test', { to: testTo, body: testBody })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#1E40AF' }}
            >
              {busy === 'test' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Send test
            </button>
          </div>
        )}
      </div>

      {/* ─── Activity log ─── */}
      <div className="rounded-xl p-5 md:col-span-2" style={{ background: '#fff', border: '1px solid var(--color-border)', gridColumn: '1 / -1' }}>
        <div className="text-sm font-bold mb-3" style={{ color: 'var(--color-text)' }}>Recent activity</div>
        <div className="rounded-lg p-3 font-mono text-xs leading-relaxed max-h-64 overflow-y-auto" style={{ background: '#0F172A', color: '#94A3B8' }}>
          {log.length === 0 && <div style={{ color: '#475569' }}>No activity yet.</div>}
          {log.map((e, i) => (
            <div key={i}>
              <span style={{ color: '#475569' }}>{new Date(e.ts).toLocaleTimeString()}</span>{' '}
              <span style={{ color: levelColor(e.level) }}>{levelIcon(e.level)}</span>{' '}
              {e.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ state }: { state: WhatsappStatus['state'] }) {
  const config: Record<WhatsappStatus['state'], { bg: string; fg: string; label: string; icon: React.ReactNode }> = {
    connected:    { bg: '#DCFCE7', fg: '#166534', label: '● Connected',    icon: <Wifi size={11} /> },
    connecting:   { bg: '#DBEAFE', fg: '#1E40AF', label: 'Connecting…',     icon: <Loader2 size={11} className="animate-spin" /> },
    pairing:      { bg: '#FEF3C7', fg: '#92400E', label: 'Pairing',         icon: <Smartphone size={11} /> },
    disconnected: { bg: '#FEE2E2', fg: '#991B1B', label: 'Not connected',   icon: <WifiOff size={11} /> },
  }
  const c = config[state]
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider" style={{ background: c.bg, color: c.fg }}>
      {c.icon} {c.label}
    </span>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1.5" style={{ borderBottom: '1px solid #F1F5F9' }}>
      <div className="text-xs w-32 shrink-0" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div className={`text-sm font-semibold ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--color-text)' }}>{value}</div>
    </div>
  )
}

function Stat({ n, label, tone = 'muted' }: { n: number; label: string; tone?: 'muted' | 'red' }) {
  return (
    <div className="rounded-lg p-3" style={{ background: '#F8FAFC' }}>
      <div className="text-xl font-extrabold font-mono" style={{ color: tone === 'red' ? '#DC2626' : 'var(--color-text)' }}>{n}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
    </div>
  )
}

function PairForm({ phone, onPhoneChange, onSubmit, busy }: { phone: string; onPhoneChange: (v: string) => void; onSubmit: () => void; busy: boolean }) {
  return (
    <div>
      <div className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
        Enter the WhatsApp number for the business account (digits only, with country code — e.g. <span className="font-mono">233241234567</span>).
      </div>
      <input
        type="text"
        value={phone}
        onChange={(e) => onPhoneChange(e.target.value)}
        placeholder="233241234567"
        className="w-full px-3 py-2.5 rounded-lg text-sm mb-3 font-mono"
        style={{ border: '1px solid var(--color-border)' }}
      />
      <button
        type="button"
        disabled={busy || phone.replace(/\D/g, '').length < 8}
        onClick={onSubmit}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: '#1E40AF' }}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Smartphone size={14} />}
        Generate pairing code
      </button>
    </div>
  )
}

function ModeTabs({ mode, setMode }: { mode: 'qr' | 'code'; setMode: (m: 'qr' | 'code') => void }) {
  return (
    <div className="inline-flex rounded-lg p-1 mb-4" style={{ background: '#F1F5F9' }}>
      {(['qr', 'code'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          className="px-3 py-1.5 rounded-md text-xs font-bold inline-flex items-center gap-1.5"
          style={{
            background: mode === m ? '#fff' : 'transparent',
            color: mode === m ? '#1E40AF' : '#64748B',
            boxShadow: mode === m ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
          }}
        >
          {m === 'qr' ? <><QrCode size={12} /> QR code</> : <><Smartphone size={12} /> Pairing code</>}
        </button>
      ))}
    </div>
  )
}

function QrStart({ onStart, busy }: { onStart: () => void; busy: boolean }) {
  return (
    <div>
      <div className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
        Scan a QR code with WhatsApp on the business phone — fastest and most reliable way to link.
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={onStart}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: '#1E40AF' }}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
        Show QR code
      </button>
    </div>
  )
}

function QrDisplay({ status, onRefresh, busy }: { status: WhatsappStatus; onRefresh: () => void; busy: boolean }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-center mb-3" style={{ color: 'var(--color-text-muted)' }}>
        Scan with WhatsApp on the business phone
      </div>
      <div className="flex justify-center my-3">
        {status.qrDataUrl ? (
          <img
            src={status.qrDataUrl}
            alt="WhatsApp pairing QR"
            width={260}
            height={260}
            className="rounded-lg"
            style={{ border: '2px solid #1E40AF', background: '#fff' }}
          />
        ) : (
          <div className="w-65 h-65 rounded-lg flex items-center justify-center" style={{ background: '#F8FAFC', border: '2px dashed #CBD5E1' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: '#94A3B8' }} />
          </div>
        )}
      </div>
      <div className="rounded-lg p-3 mt-3 text-xs leading-relaxed" style={{ background: '#F0F9FF', borderLeft: '3px solid #1E40AF', color: '#1E40AF' }}>
        <strong style={{ display: 'block', marginBottom: 4, color: '#1E3A8A' }}>How to scan</strong>
        1. Open WhatsApp on the business phone<br />
        2. Settings → Linked Devices → Link a Device<br />
        3. Point the camera at the QR code above
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={onRefresh}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
        style={{ color: '#1E40AF' }}
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} New QR
      </button>
    </div>
  )
}

function PairingDisplay({ status }: { status: WhatsappStatus }) {
  const code = status.pairingCode ?? ''
  const digits = code.split('')
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-center mb-3" style={{ color: 'var(--color-text-muted)' }}>
        Enter this code on your phone
      </div>
      <div className="flex gap-1.5 justify-center my-3 flex-wrap">
        {digits.map((d, i) =>
          d === '-' ? (
            <div key={i} className="text-2xl font-bold flex items-center" style={{ color: '#94A3B8' }}>·</div>
          ) : (
            <div
              key={i}
              className="w-9 h-12 rounded-lg flex items-center justify-center font-mono text-xl font-bold"
              style={{ background: 'linear-gradient(180deg,#F8FAFC,#EFF6FF)', border: '2px solid #1E40AF', color: '#1E40AF' }}
            >
              {d}
            </div>
          ),
        )}
      </div>
      <div className="rounded-lg p-3 mt-3 text-xs leading-relaxed" style={{ background: '#F0F9FF', borderLeft: '3px solid #1E40AF', color: '#1E40AF' }}>
        <strong style={{ display: 'block', marginBottom: 4, color: '#1E3A8A' }}>How to pair</strong>
        1. Open WhatsApp on <span className="font-mono">+{status.pairingFor}</span><br />
        2. Settings → Linked Devices → Link a Device<br />
        3. Link with phone number instead → enter the code above
      </div>
    </div>
  )
}

function levelIcon(l: LogEntry['level']) {
  return l === 'ok' ? '✓' : l === 'err' ? '✗' : l === 'warn' ? '!' : '→'
}
function levelColor(l: LogEntry['level']) {
  return l === 'ok' ? '#10B981' : l === 'err' ? '#EF4444' : l === 'warn' ? '#FBBF24' : '#60A5FA'
}
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}
