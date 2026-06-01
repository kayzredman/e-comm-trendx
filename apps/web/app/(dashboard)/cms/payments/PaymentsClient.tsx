'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  paymentsAdminApi,
  type PaymentConfig,
  type PaymentEventRow,
  type PaymentIntentRow,
  type PaymentIntentStatus,
  type PaymentStats,
} from '@/lib/api'
import {
  CreditCard, RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle,
  ShieldCheck, ShieldAlert, RotateCcw, Wifi, WifiOff, Activity, Undo2,
} from 'lucide-react'

type Tab = 'intents' | 'events'

const STATUS_FILTERS: Array<PaymentIntentStatus | 'ALL'> = [
  'ALL', 'REQUIRES_AUTH', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'ABANDONED',
]

export default function PaymentsClient(props: {
  token: string
  initialStats: PaymentStats | null
  initialConfig: PaymentConfig | null
  initialIntents: PaymentIntentRow[]
}) {
  const { token } = props

  const [stats, setStats] = useState<PaymentStats | null>(props.initialStats)
  const [config, setConfig] = useState<PaymentConfig | null>(props.initialConfig)
  const [intents, setIntents] = useState<PaymentIntentRow[]>(props.initialIntents)
  const [events, setEvents] = useState<PaymentEventRow[]>([])
  const [tab, setTab] = useState<Tab>('intents')
  const [statusFilter, setStatusFilter] = useState<PaymentIntentStatus | 'ALL'>('ALL')
  const [refreshing, setRefreshing] = useState(false)
  const [reconciling, setReconciling] = useState(false)
  const [replayingId, setReplayingId] = useState<string | null>(null)
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!token) return
    setRefreshing(true)
    setError(null)
    try {
      const [s, c, i] = await Promise.all([
        paymentsAdminApi.stats(token),
        paymentsAdminApi.config(token),
        paymentsAdminApi.intents(token, statusFilter === 'ALL' ? undefined : statusFilter, 50),
      ])
      setStats(s); setConfig(c); setIntents(i)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRefreshing(false)
    }
  }, [token, statusFilter])

  const loadEvents = useCallback(async () => {
    if (!token) return
    setEventsLoading(true)
    try {
      const rows = await paymentsAdminApi.events(token, { limit: 100 })
      setEvents(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setEventsLoading(false)
    }
  }, [token])

  useEffect(() => { reload() }, [reload])
  useEffect(() => { if (tab === 'events') loadEvents() }, [tab, loadEvents])

  // Auto-refresh stats every 20s on intents tab
  useEffect(() => {
    if (tab !== 'intents') return
    const t = setInterval(() => { reload() }, 20000)
    return () => clearInterval(t)
  }, [tab, reload])

  async function handleReplay(eventId: string) {
    if (!token) return
    setReplayingId(eventId)
    try {
      const res = await paymentsAdminApi.replay(token, eventId)
      setToast(res.ok ? 'Event replayed' : `Replay failed: ${res.error ?? 'unknown'}`)
      await loadEvents()
      await reload()
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e))
    } finally {
      setReplayingId(null)
      setTimeout(() => setToast(null), 3500)
    }
  }

  async function handleReconcile() {
    if (!token) return
    setReconciling(true)
    try {
      const res = await paymentsAdminApi.reconcile(token)
      setToast(`Reconciled ${res.reconciled} stuck intent(s)`)
      await reload()
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e))
    } finally {
      setReconciling(false)
      setTimeout(() => setToast(null), 3500)
    }
  }

  async function handleRefund(intent: PaymentIntentRow) {
    if (!token) return
    const charged = Number(intent.amount)
    const already = Number(intent.refundedAmount ?? 0)
    const remaining = +(charged - already).toFixed(2)
    if (remaining <= 0) { setToast('Already fully refunded'); setTimeout(() => setToast(null), 3000); return }
    const raw = window.prompt(
      `Refund amount for ${intent.providerReference}\nRemaining: ₵${remaining.toFixed(2)}\n\nEnter amount in GHS (leave blank for full refund):`,
      remaining.toFixed(2),
    )
    if (raw === null) return
    const amount = raw.trim() === '' ? undefined : Number(raw)
    if (amount != null && (!Number.isFinite(amount) || amount <= 0)) {
      setToast('Invalid amount'); setTimeout(() => setToast(null), 3000); return
    }
    const reason = window.prompt('Reason (optional):', '') ?? undefined
    if (!window.confirm(`Refund ₵${(amount ?? remaining).toFixed(2)} from ${intent.providerReference}?`)) return
    setRefundingId(intent.id)
    try {
      await paymentsAdminApi.refund(token, intent.id, { amount, reason })
      setToast('Refund requested — settles via webhook')
      await reload()
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e))
    } finally {
      setRefundingId(null)
      setTimeout(() => setToast(null), 4000)
    }
  }

  return (
    <div
      className="flex-1 p-4 md:p-6 lg:p-8 min-h-screen"
      style={{ background: '#EFF6FF' }}
    >
      <div className="max-w-450 mx-auto">
        <Header config={config} refreshing={refreshing} onRefresh={reload} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Succeeded (24h)"
            value={stats ? String(stats.last24h.succeeded) : '—'}
            tone="green"
            icon={CheckCircle2}
          />
          <StatCard
            label="Failed (24h)"
            value={stats ? String(stats.last24h.failed) : '—'}
            tone="red"
            icon={XCircle}
          />
          <StatCard
            label="Open"
            value={stats ? String(stats.last24h.open) : '—'}
            tone="amber"
            icon={Clock}
            hint={stats && stats.oldestPendingSeconds > 0 ? `oldest ${fmtAgo(stats.oldestPendingSeconds)}` : undefined}
          />
          <StatCard
            label="Revenue (24h)"
            value={stats ? `₵${Number(stats.last24h.revenue).toFixed(2)}` : '—'}
            tone="blue"
            icon={CreditCard}
          />
        </div>

        <HealthStrip
          stats={stats}
          config={config}
          onReconcile={handleReconcile}
          reconciling={reconciling}
        />

        {error && (
          <div
            className="rounded-xl border p-4 mb-6 flex items-start gap-3"
            style={{ borderColor: '#FECACA', background: '#FEF2F2' }}
          >
            <AlertCircle size={20} style={{ color: '#B91C1C' }} />
            <div>
              <div className="font-bold" style={{ color: '#7F1D1D' }}>API error</div>
              <div className="text-xs font-mono" style={{ color: '#991B1B' }}>{error}</div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <TabBtn active={tab === 'intents'} onClick={() => setTab('intents')}>
            Intents <span className="ml-1 text-xs opacity-60">({intents.length})</span>
          </TabBtn>
          <TabBtn active={tab === 'events'} onClick={() => setTab('events')}>
            Webhook events <span className="ml-1 text-xs opacity-60">({events.length || '–'})</span>
          </TabBtn>
        </div>

        {tab === 'intents' && (
          <IntentsTab
            intents={intents}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            onRefresh={reload}
            onRefund={handleRefund}
            refundingId={refundingId}
          />
        )}
        {tab === 'events' && (
          <EventsTab
            events={events}
            loading={eventsLoading}
            replayingId={replayingId}
            onReplay={handleReplay}
            onRefresh={loadEvents}
          />
        )}
      </div>

      {toast && (
        <div
          className="fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
          style={{ background: '#0F172A', color: '#fff' }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

// ─── Sections ──────────────────────────────────────────────────────────────────

function Header({
  config, refreshing, onRefresh,
}: { config: PaymentConfig | null; refreshing: boolean; onRefresh: () => void }) {
  const modeColor =
    config?.mode === 'live' ? '#059669' :
    config?.mode === 'test' ? '#D97706' :
    '#6B7280'
  const modeLabel =
    config?.mode === 'live' ? 'LIVE' :
    config?.mode === 'test' ? 'TEST' :
    'DISABLED'
  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#2563EB,#1E40AF)' }}
        >
          <CreditCard size={20} color="#fff" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: '#0F172A' }}>
            Payments
          </h1>
          <p className="text-sm" style={{ color: '#64748B' }}>
            Paystack intents, webhook events, and circuit-breaker status.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="px-2.5 py-1 rounded-md text-xs font-bold"
          style={{ background: `${modeColor}1A`, color: modeColor }}
        >
          {modeLabel}
        </span>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
    </div>
  )
}

function StatCard({
  label, value, tone, icon: Icon, hint,
}: {
  label: string; value: string; tone: 'green' | 'red' | 'amber' | 'blue';
  icon: React.ElementType; hint?: string
}) {
  const colors = {
    green: { bg: '#ECFDF5', fg: '#065F46' },
    red:   { bg: '#FEF2F2', fg: '#991B1B' },
    amber: { bg: '#FFFBEB', fg: '#92400E' },
    blue:  { bg: '#EFF6FF', fg: '#1E40AF' },
  }[tone]
  return (
    <div
      className="rounded-2xl border p-4 bg-white"
      style={{ borderColor: '#E2E8F0' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>
          {label}
        </span>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: colors.bg }}
        >
          <Icon size={14} style={{ color: colors.fg }} />
        </div>
      </div>
      <div className="font-mono tabular-nums text-2xl font-extrabold" style={{ color: '#0F172A' }}>
        {value}
      </div>
      {hint && <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>{hint}</div>}
    </div>
  )
}

function HealthStrip({
  stats, config, onReconcile, reconciling,
}: {
  stats: PaymentStats | null
  config: PaymentConfig | null
  onReconcile: () => void
  reconciling: boolean
}) {
  const cb = stats?.circuitBreaker ?? config?.circuitBreaker
  const cbState = cb?.state ?? 'unknown'
  const cbHealthy = cbState === 'closed'
  const stuck = stats?.stuckIntents ?? 0
  const errs = stats?.eventsWithErrors24h ?? 0
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <InfoTile
        icon={cbHealthy ? ShieldCheck : ShieldAlert}
        tone={cbHealthy ? 'ok' : 'warn'}
        title="Circuit breaker"
        value={cbState.toUpperCase()}
        sub={cb ? `${cb.failures} consecutive failures` : '—'}
      />
      <InfoTile
        icon={stuck > 0 ? Clock : CheckCircle2}
        tone={stuck > 0 ? 'warn' : 'ok'}
        title="Stuck intents (>10m)"
        value={String(stuck)}
        sub={stuck > 0 ? 'reconcile recommended' : 'all good'}
        action={stuck > 0 ? { label: reconciling ? 'Reconciling…' : 'Reconcile now', onClick: onReconcile, disabled: reconciling } : undefined}
      />
      <InfoTile
        icon={errs > 0 ? AlertCircle : Activity}
        tone={errs > 0 ? 'warn' : 'ok'}
        title="Event errors (24h)"
        value={String(errs)}
        sub={errs > 0 ? 'see Webhook events tab' : 'no errors'}
      />
    </div>
  )
}

function InfoTile({
  icon: Icon, tone, title, value, sub, action,
}: {
  icon: React.ElementType
  tone: 'ok' | 'warn'
  title: string; value: string; sub?: string
  action?: { label: string; onClick: () => void; disabled?: boolean }
}) {
  const c = tone === 'ok'
    ? { bg: '#ECFDF5', fg: '#047857' }
    : { bg: '#FFFBEB', fg: '#B45309' }
  return (
    <div className="rounded-2xl border p-4 bg-white flex items-center gap-3" style={{ borderColor: '#E2E8F0' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.bg }}>
        <Icon size={18} style={{ color: c.fg }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>{title}</div>
        <div className="font-bold" style={{ color: '#0F172A' }}>{value}</div>
        {sub && <div className="text-xs" style={{ color: '#94A3B8' }}>{sub}</div>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          disabled={action.disabled}
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
          style={{ background: '#F97316' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors"
      style={{
        borderColor: active ? '#2563EB' : 'transparent',
        color: active ? '#1E40AF' : '#64748B',
      }}
    >
      {children}
    </button>
  )
}

function IntentsTab({
  intents, statusFilter, onStatusChange, onRefresh, onRefund, refundingId,
}: {
  intents: PaymentIntentRow[]
  statusFilter: PaymentIntentStatus | 'ALL'
  onStatusChange: (s: PaymentIntentStatus | 'ALL') => void
  onRefresh: () => void
  onRefund: (intent: PaymentIntentRow) => void
  refundingId: string | null
}) {
  return (
    <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
      <div className="flex flex-wrap items-center gap-2 p-3 border-b" style={{ borderColor: '#E2E8F0' }}>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => { onStatusChange(s); onRefresh() }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{
              background: statusFilter === s ? '#2563EB' : '#F1F5F9',
              color: statusFilter === s ? '#fff' : '#475569',
            }}
          >
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ background: '#F8FAFC' }}>
            <tr>
              <Th>Reference</Th>
              <Th>Order</Th>
              <Th>Status</Th>
              <Th>Channel</Th>
              <Th className="text-right">Amount</Th>
              <Th className="text-right">Refunded</Th>
              <Th>Created</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {intents.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12" style={{ color: '#94A3B8' }}>No intents</td></tr>
            )}
            {intents.map((it) => {
              const charged = Number(it.amount)
              const refunded = Number(it.refundedAmount ?? 0)
              const remaining = +(charged - refunded).toFixed(2)
              const canRefund = it.status === 'SUCCEEDED' && remaining > 0
              return (
                <tr key={it.id} className="border-t" style={{ borderColor: '#F1F5F9' }}>
                  <Td><span className="font-mono text-xs">{it.providerReference}</span></Td>
                  <Td><span className="font-mono text-xs">{it.orderId}</span></Td>
                  <Td><StatusPill status={it.status} /></Td>
                  <Td>{it.channel ?? '—'}</Td>
                  <Td className="text-right font-mono tabular-nums">₵{charged.toFixed(2)}</Td>
                  <Td className="text-right font-mono tabular-nums">
                    {refunded > 0 ? (
                      <span style={{ color: refunded >= charged ? '#B91C1C' : '#B45309' }}>
                        ₵{refunded.toFixed(2)}
                        {refunded < charged && (
                          <span className="text-xs ml-1" style={{ color: '#94A3B8' }}>partial</span>
                        )}
                      </span>
                    ) : (
                      <span style={{ color: '#CBD5E1' }}>—</span>
                    )}
                  </Td>
                  <Td><span className="text-xs" style={{ color: '#64748B' }}>{fmtDate(it.createdAt)}</span></Td>
                  <Td>
                    {canRefund && (
                      <button
                        onClick={() => onRefund(it)}
                        disabled={refundingId === it.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium hover:bg-rose-50 disabled:opacity-50"
                        style={{ borderColor: '#FECACA', color: '#B91C1C' }}
                        title={`Refund up to ₵${remaining.toFixed(2)}`}
                      >
                        <Undo2 size={12} className={refundingId === it.id ? 'animate-spin' : ''} />
                        Refund
                      </button>
                    )}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EventsTab({
  events, loading, replayingId, onReplay, onRefresh,
}: {
  events: PaymentEventRow[]
  loading: boolean
  replayingId: string | null
  onReplay: (id: string) => void
  onRefresh: () => void
}) {
  return (
    <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
      <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: '#E2E8F0' }}>
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>
          Last 100 webhook events
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
          style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Reload
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ background: '#F8FAFC' }}>
            <tr>
              <Th>Type</Th>
              <Th>Reference</Th>
              <Th>Sig</Th>
              <Th>Processed</Th>
              <Th>Error</Th>
              <Th>Received</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && !loading && (
              <tr><td colSpan={7} className="text-center py-12" style={{ color: '#94A3B8' }}>No events</td></tr>
            )}
            {events.map((e) => (
              <tr key={e.id} className="border-t" style={{ borderColor: '#F1F5F9' }}>
                <Td><span className="font-mono text-xs">{e.eventType}</span></Td>
                <Td><span className="font-mono text-xs">{e.reference ?? '—'}</span></Td>
                <Td>
                  {e.signatureValid === true && (
                    <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#047857' }}>
                      <Wifi size={12} /> ok
                    </span>
                  )}
                  {e.signatureValid === false && (
                    <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#B91C1C' }}>
                      <WifiOff size={12} /> bad
                    </span>
                  )}
                  {e.signatureValid === null && <span className="text-xs" style={{ color: '#94A3B8' }}>—</span>}
                </Td>
                <Td>
                  {e.processed ? (
                    <CheckCircle2 size={14} style={{ color: '#047857' }} />
                  ) : (
                    <Clock size={14} style={{ color: '#B45309' }} />
                  )}
                </Td>
                <Td>
                  {e.processingError ? (
                    <span className="text-xs font-mono" style={{ color: '#B91C1C' }} title={e.processingError}>
                      {e.processingError.slice(0, 40)}{e.processingError.length > 40 ? '…' : ''}
                    </span>
                  ) : <span className="text-xs" style={{ color: '#94A3B8' }}>—</span>}
                </Td>
                <Td><span className="text-xs" style={{ color: '#64748B' }}>{fmtDate(e.receivedAt)}</span></Td>
                <Td>
                  <button
                    onClick={() => onReplay(e.id)}
                    disabled={replayingId === e.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                    style={{ borderColor: '#E2E8F0', color: '#1E40AF' }}
                    title="Replay this webhook event"
                  >
                    <RotateCcw size={12} className={replayingId === e.id ? 'animate-spin' : ''} />
                    Replay
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: PaymentIntentStatus }) {
  const map: Record<PaymentIntentStatus, { bg: string; fg: string }> = {
    SUCCEEDED:     { bg: '#DCFCE7', fg: '#15803D' },
    FAILED:        { bg: '#FEE2E2', fg: '#B91C1C' },
    ABANDONED:     { bg: '#F3F4F6', fg: '#4B5563' },
    PROCESSING:    { bg: '#DBEAFE', fg: '#1E40AF' },
    REQUIRES_AUTH: { bg: '#FFEDD5', fg: '#9A3412' },
  }
  const c = map[status]
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-md text-xs font-bold"
      style={{ background: c.bg, color: c.fg }}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-3 py-2 text-left text-xs font-bold uppercase tracking-wide ${className ?? ''}`}
      style={{ color: '#64748B' }}
    >{children}</th>
  )
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className ?? ''}`} style={{ color: '#0F172A' }}>{children}</td>
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}
function fmtAgo(sec: number): string {
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.floor(sec / 60)}m`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`
  return `${Math.floor(sec / 86400)}d`
}
