'use client'

import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react'
import {
  healthApi,
  type HealthReport,
  type ServiceCheck,
  type ServiceStatus,
  type ServiceKind,
  type RestartTarget,
  type RestartMethod,
  type UserRole,
} from '@/lib/api'
import {
  CheckCircle, AlertTriangle, XCircle, RefreshCw, Database,
  Server, Shield, Globe, Zap, Clock, Activity, MemoryStick,
  Power, Recycle, WifiOff, Cpu, Info, ChevronDown, ChevronUp,
  Layers, Network, ShoppingBag,
} from 'lucide-react'

interface Props {
  initialReport: HealthReport | null
  token: string
  currentRole: UserRole | null
}

type ActionFeedback = {
  service: string
  ok: boolean
  message: string
  ts: number
}

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  healthy:  { label: 'Healthy',  color: '#16A34A', bg: '#DCFCE7', icon: CheckCircle },
  degraded: { label: 'Degraded', color: '#D97706', bg: '#FEF3C7', icon: AlertTriangle },
  down:     { label: 'Down',     color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
}

const SERVICE_ICONS: Record<string, typeof Server> = {
  'PostgreSQL':   Database,
  'API Server':   Server,
  'Web App':      Globe,
  'Storefront':   ShoppingBag,
  'Clerk Auth':   Shield,
}

const KIND_META: Record<ServiceKind, { label: string; icon: typeof Server; color: string }> = {
  self:     { label: 'Application',  icon: Cpu,     color: '#2563EB' },
  database: { label: 'Data',         icon: Database, color: '#7C3AED' },
  http:     { label: 'Frontend',     icon: Network, color: '#0EA5E9' },
  auth:     { label: 'External',     icon: Shield,  color: '#F59E0B' },
}

const RESTART_LABEL: Record<RestartMethod, string> = {
  'railway':      'Railway redeploy',
  'tsx-watch':    'Local: file-touch reload',
  'next-watch':   'Local: file-touch reload',
  'unsupported':  'Unavailable',
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Icon size={12} />
      {cfg.label}
    </span>
  )
}

function LatencyBar({ ms }: { ms: number | null }) {
  if (ms === null) return <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>—</span>
  const color = ms > 500 ? '#DC2626' : ms > 200 ? '#D97706' : '#16A34A'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 80, height: 6, borderRadius: 3, background: 'var(--color-border)' }}>
        <div style={{ width: `${Math.min(100, (ms / 1000) * 100)}%`, height: 6, borderRadius: 3, background: color, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{ms}ms</span>
    </div>
  )
}

function UptimeRing({ status }: { status: ServiceStatus }) {
  const pct = status === 'healthy' ? 99.9 : status === 'degraded' ? 85 : 0
  const color = STATUS_CONFIG[status].color
  const r = 24
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  return (
    <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
      <svg width={64} height={64} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={32} cy={32} r={r} fill="none" stroke="var(--color-border)" strokeWidth={6} />
        <circle
          cx={32} cy={32} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', lineHeight: 1,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{pct}%</span>
      </div>
    </div>
  )
}

function ActionButton({ icon: Icon, label, onClick, disabled, busy, tone = 'neutral', size = 'sm' }: {
  icon: typeof RefreshCw
  label: string
  onClick: () => void
  disabled?: boolean
  busy?: boolean
  tone?: 'neutral' | 'primary' | 'danger' | 'warning'
  size?: 'sm' | 'xs'
}) {
  const toneStyles: Record<NonNullable<typeof tone>, { bg: string; color: string; border: string }> = {
    neutral: { bg: 'var(--color-surface)', color: 'var(--color-text)', border: 'var(--color-border)' },
    primary: { bg: 'var(--color-primary-light)', color: 'var(--color-primary)', border: 'var(--color-primary)' },
    danger:  { bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' },
    warning: { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' },
  }
  const t = toneStyles[tone]
  const pad = size === 'xs' ? '4px 8px' : '6px 10px'
  const fontSize = size === 'xs' ? 11 : 12
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className="inline-flex items-center gap-1.5 rounded-md font-semibold border transition-colors"
      style={{
        background: t.bg,
        color: t.color,
        borderColor: t.border,
        padding: pad,
        fontSize,
        opacity: (disabled || busy) ? 0.55 : 1,
        cursor: (disabled || busy) ? 'not-allowed' : 'pointer',
      }}
    >
      <Icon size={size === 'xs' ? 11 : 12} className={busy ? 'animate-spin' : ''} />
      {busy ? 'Working…' : label}
    </button>
  )
}

function ServiceCard({
  service, capabilities, isOwner, busyAction, history, expanded, onToggleExpand,
  onReconnect, onRecheck, onRestart, onGc,
}: {
  service: ServiceCheck
  capabilities: HealthReport['capabilities']
  isOwner: boolean
  busyAction: string | null
  history: number[]
  expanded: boolean
  onToggleExpand: () => void
  onReconnect: () => void
  onRecheck: () => void
  onRestart: () => void
  onGc: () => void
}) {
  const Icon = SERVICE_ICONS[service.name] ?? Server
  const cfg = STATUS_CONFIG[service.status]
  const actions = service.actions ?? []
  const busy = (a: string) => busyAction === `${service.name}:${a}`

  const restartTarget: RestartTarget | null =
    service.name === 'API Server' ? 'api' :
    service.name === 'Web App'    ? 'web' : null
  const restartMethod = restartTarget === 'api' ? capabilities.canRestartApi
                      : restartTarget === 'web' ? capabilities.canRestartWeb
                      : 'unsupported'
  const detailEntries = service.details ? Object.entries(service.details) : []
  const hasDetails = detailEntries.length > 0

  return (
    <div
      className="rounded-xl border flex flex-col"
      style={{
        background: 'var(--color-surface)',
        borderColor: service.status !== 'healthy' ? cfg.color + '40' : 'var(--color-border)',
        boxShadow: service.status === 'down' ? `0 0 0 2px ${cfg.color}20` : '0 1px 2px rgba(15,23,42,0.04)',
        overflow: 'hidden',
      }}
    >
      {/* Header strip */}
      <div
        style={{
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          borderBottom: '1px solid var(--color-border)',
          background: service.status === 'down' ? cfg.bg + '40'
                    : service.status === 'degraded' ? cfg.bg + '30'
                    : 'transparent',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: cfg.bg, position: 'relative' }}
          >
            <Icon size={20} style={{ color: cfg.color }} />
            {service.status !== 'healthy' && (
              <span
                style={{
                  position: 'absolute', top: -2, right: -2,
                  width: 10, height: 10, borderRadius: 5,
                  background: cfg.color,
                  boxShadow: `0 0 0 3px ${cfg.bg}`,
                  animation: service.status === 'down' ? 'pulse 1.6s ease-in-out infinite' : undefined,
                }}
              />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{service.name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Checked {new Date(service.checkedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <StatusBadge status={service.status} />
      </div>

      {/* Body: ring + message + latency */}
      <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <UptimeRing status={service.status} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="text-xs mb-2" style={{ color: 'var(--color-text)', lineHeight: 1.4 }}>{service.message}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={12} style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Latency</span>
            <LatencyBar ms={service.latencyMs} />
          </div>
        </div>
      </div>

      {/* Sparkline */}
      {history.length > 1 && (
        <div style={{ padding: '0 18px 12px' }}>
          <Sparkline data={history} color={cfg.color} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              Last {history.length} checks
            </span>
            <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
              avg {Math.round(history.reduce((a, b) => a + b, 0) / history.length)}ms
            </span>
          </div>
        </div>
      )}

      {/* Details chips (collapsible) */}
      {hasDetails && (
        <div style={{ borderTop: '1px solid var(--color-border)' }}>
          <button
            type="button"
            onClick={onToggleExpand}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium"
            style={{
              color: 'var(--color-text-muted)',
              background: expanded ? 'var(--color-page)' : 'transparent',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Info size={12} />
              {expanded ? 'Hide details' : `Show ${detailEntries.length} details`}
            </span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expanded && (
            <div
              style={{
                padding: '4px 14px 14px',
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8,
                background: 'var(--color-page)',
              }}
            >
              {detailEntries.map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6, padding: '6px 10px',
                    display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0,
                  }}
                >
                  <span
                    className="text-[10px] uppercase tracking-wide font-semibold"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {k}
                  </span>
                  <span
                    className="text-xs font-semibold truncate"
                    style={{ color: 'var(--color-text)', fontFamily: typeof v === 'number' ? 'monospace' : undefined }}
                    title={String(v)}
                  >
                    {String(v)}
                  </span>
                </div>
              ))}
              {service.url && (
                <div
                  style={{
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: 6, padding: '6px 10px', gridColumn: '1 / -1',
                    display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0,
                  }}
                >
                  <span
                    className="text-[10px] uppercase tracking-wide font-semibold"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    endpoint
                  </span>
                  <span
                    className="text-xs truncate"
                    style={{ color: 'var(--color-text)', fontFamily: 'monospace' }}
                    title={service.url}
                  >
                    {service.url}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6,
        padding: '12px 18px',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-page)',
      }}>
        {actions.includes('recheck') && (
          <ActionButton
            icon={RefreshCw} label="Recheck" tone="neutral" size="xs"
            onClick={onRecheck} busy={busy('recheck')}
          />
        )}
        {actions.includes('reconnect') && (
          <ActionButton
            icon={WifiOff} label="Reconnect" tone="warning" size="xs"
            onClick={onReconnect} busy={busy('reconnect')}
          />
        )}
        {actions.includes('gc') && capabilities.canForceGc && (
          <ActionButton
            icon={Recycle} label="Force GC" tone="neutral" size="xs"
            onClick={onGc} busy={busy('gc')}
          />
        )}
        {actions.includes('restart') && restartTarget && (
          <ActionButton
            icon={Power}
            label={`Restart (${RESTART_LABEL[restartMethod]})`}
            tone={restartMethod === 'unsupported' ? 'neutral' : 'danger'}
            size="xs"
            disabled={!isOwner || restartMethod === 'unsupported'}
            onClick={onRestart}
            busy={busy('restart')}
          />
        )}
        {actions.includes('restart') && restartTarget && !isOwner && (
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', alignSelf: 'center' }}>
            (OWNER only)
          </span>
        )}
      </div>
    </div>
  )
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const w = 100, h = 24
  const max = Math.max(...data, 1)
  const min = Math.min(...data)
  const span = Math.max(1, max - min)
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / span) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 24, display: 'block' }} preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function MemoryMeter({ used, total, percent }: { used: number; total: number; percent: number }) {
  const color = percent > 90 ? '#DC2626' : percent > 70 ? '#D97706' : '#16A34A'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Heap memory</span>
        <span className="text-xs font-bold" style={{ color }}>{used}MB / {total}MB ({percent}%)</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'var(--color-border)' }}>
        <div style={{ width: `${percent}%`, height: 8, borderRadius: 4, background: color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <span className="text-[10px] uppercase tracking-wide font-semibold"
        style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <span className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
      <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>{label}</span>
      <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  )
}

function formatUptime(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}h ${m}m ${sec}s`
}

export default function ServiceQualityClient({ initialReport, token, currentRole }: Props) {
  const [report, setReport] = useState<HealthReport | null>(initialReport)
  const [loading, setLoading] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [countdown, setCountdown] = useState(30)
  const [feedback, setFeedback] = useState<ActionFeedback[]>([])
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({ 'API Server': true })
  const [history, setHistory] = useState<Record<string, number[]>>({})
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Set initial timestamp on the client only to avoid SSR hydration mismatch.
  useEffect(() => { setLastRefresh(new Date()) }, [])

  // Track latency history for sparklines (last 20 samples per service)
  useEffect(() => {
    if (!report) return
    setHistory(prev => {
      const next = { ...prev }
      for (const s of report.services) {
        if (s.latencyMs === null) continue
        const arr = (next[s.name] ?? []).concat(s.latencyMs)
        next[s.name] = arr.length > 20 ? arr.slice(arr.length - 20) : arr
      }
      return next
    })
  }, [report])

  const isOwner = currentRole === 'OWNER'

  const toggleExpand = (name: string) =>
    setExpandedCards(prev => ({ ...prev, [name]: !prev[name] }))

  const errMsg = (err: unknown, fallback: string): string => {
    if (err instanceof Error) return err.message
    if (typeof err === 'string') return err
    return fallback
  }

  const pushFeedback = (f: Omit<ActionFeedback, 'ts'>) => {
    setFeedback(prev => [{ ...f, ts: Date.now() }, ...prev].slice(0, 8))
  }

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await healthApi.services(token)
      setReport(data)
      setLastRefresh(new Date())
      setCountdown(30)
    } catch {
      // API might be restarting
    } finally {
      setLoading(false)
    }
  }, [token])

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (countRef.current) clearInterval(countRef.current)
      return
    }
    intervalRef.current = setInterval(refresh, 30_000)
    countRef.current = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 30), 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (countRef.current) clearInterval(countRef.current)
    }
  }, [autoRefresh, refresh])

  const updateSingleService = (updated: ServiceCheck) => {
    setReport(prev => prev ? {
      ...prev,
      services: prev.services.map(s => s.name === updated.name ? updated : s),
    } : prev)
  }

  const runWithBusy = async (key: string, fn: () => Promise<void>) => {
    setBusyAction(key)
    try { await fn() } finally { setBusyAction(null) }
  }

  const handleReconnectDb = (service: ServiceCheck) =>
    runWithBusy(`${service.name}:reconnect`, async () => {
      try {
        const res = await healthApi.reconnectDb(token)
        updateSingleService(res.result)
        pushFeedback({ service: service.name, ok: res.result.status !== 'down',
          message: `Reconnected — ${res.result.message}` })
      } catch (err: unknown) {
        pushFeedback({ service: service.name, ok: false, message: errMsg(err, 'Reconnect failed') })
      }
    })

  const handleRecheck = (service: ServiceCheck) =>
    runWithBusy(`${service.name}:recheck`, async () => {
      try {
        const res = await healthApi.recheck(token, service.name)
        updateSingleService(res)
        pushFeedback({ service: service.name, ok: res.status !== 'down', message: `Rechecked — ${res.message}` })
      } catch (err: unknown) {
        pushFeedback({ service: service.name, ok: false, message: errMsg(err, 'Recheck failed') })
      }
    })

  const handleGc = (service: ServiceCheck) =>
    runWithBusy(`${service.name}:gc`, async () => {
      try {
        const res = await healthApi.gc(token)
        pushFeedback({
          service: service.name,
          ok: res.ran,
          message: res.ran
            ? `GC freed ${res.before - res.after}MB (${res.before}→${res.after})`
            : 'GC not exposed — start Node with --expose-gc to enable',
        })
        await refresh()
      } catch (err: unknown) {
        pushFeedback({ service: service.name, ok: false, message: errMsg(err, 'GC failed') })
      }
    })

  const handleRestart = (service: ServiceCheck, target: RestartTarget) =>
    runWithBusy(`${service.name}:restart`, async () => {
      if (!confirm(`Restart ${service.name}? This will briefly take the service offline.`)) return
      try {
        const res = await healthApi.restart(token, target)
        pushFeedback({
          service: service.name,
          ok: res.ok,
          message: `[${res.method}] ${res.message}`,
        })
        // Give the service a moment to come back, then refresh
        setTimeout(() => { void refresh() }, target === 'api' ? 4000 : 2000)
      } catch (err: unknown) {
        pushFeedback({ service: service.name, ok: false, message: errMsg(err, 'Restart failed') })
      }
    })

  const overall = report?.overall ?? 'down'
  const overallCfg = STATUS_CONFIG[overall]
  const OverallIcon = overallCfg.icon

  // Group services by kind for sectioned rendering
  const groupedServices = useMemo(() => {
    if (!report) return [] as Array<{ kind: ServiceKind; services: ServiceCheck[] }>
    const order: ServiceKind[] = ['self', 'database', 'http', 'auth']
    const buckets = new Map<ServiceKind, ServiceCheck[]>()
    for (const s of report.services) {
      const list = buckets.get(s.kind) ?? []
      list.push(s)
      buckets.set(s.kind, list)
    }
    return order
      .filter(k => buckets.has(k))
      .map(k => ({ kind: k, services: buckets.get(k)! }))
  }, [report])

  const healthyCount = report?.services.filter(s => s.status === 'healthy').length ?? 0
  const totalCount = report?.services.length ?? 0

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: 'var(--color-text)' }}>
            <Activity size={22} style={{ color: 'var(--color-primary)' }} />
            Service Quality
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Real-time monitoring & control plane for all TrendMarga services
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border"
            style={{
              background: autoRefresh ? 'var(--color-primary-light)' : 'var(--color-surface)',
              color: autoRefresh ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderColor: 'var(--color-border)',
            }}
          >
            <Zap size={13} />
            {autoRefresh ? `Auto (${countdown}s)` : 'Auto: off'}
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh now
          </button>
        </div>
      </div>

      {/* Overall status banner */}
      {/* Overall status banner */}
      <div
        className="rounded-xl border p-5 mb-6"
        style={{
          background: `linear-gradient(135deg, ${overallCfg.bg} 0%, var(--color-surface) 100%)`,
          borderColor: overallCfg.color + '40',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 52, height: 52, borderRadius: 12,
              background: overallCfg.bg,
              border: `2px solid ${overallCfg.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <OverallIcon size={26} style={{ color: overallCfg.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p className="font-bold text-lg" style={{ color: overallCfg.color }}>
              {overall === 'healthy' ? 'All systems operational' :
               overall === 'degraded' ? 'Some services are degraded' :
               'Critical: Services are down'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {healthyCount}/{totalCount} services healthy
              {report && ` · ${report.process.env} · ${report.process.platform}/${report.process.arch} · Node ${report.process.nodeVersion} · v${report.process.apiVersion}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <Metric label="Uptime" value={report ? formatUptime(report.serverUptimeSeconds) : '—'} />
            <Metric label="Heap" value={report ? `${report.memoryMB.used}/${report.memoryMB.total}MB` : '—'} />
            <Metric label="Loop p99" value={report ? `${report.eventLoop.lagP99Ms}ms` : '—'} />
            <Metric label="Last check" value={lastRefresh ? lastRefresh.toLocaleTimeString() : '—'} />
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: overallCfg.color, fontSize: 12 }}>
                <RefreshCw size={14} className="animate-spin" />
                Checking…
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Service cards grouped by kind */}
      {report ? (
        <>
          {groupedServices.map(({ kind, services }) => {
            const meta = KIND_META[kind]
            const KindIcon = meta.icon
            return (
              <div key={kind} style={{ marginBottom: 24 }}>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: meta.color + '15',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <KindIcon size={15} style={{ color: meta.color }} />
                  </div>
                  <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                    {meta.label}
                  </h2>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: meta.color + '15', color: meta.color }}
                  >
                    {services.length}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--color-border)', marginLeft: 8 }} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {services.map(service => {
                    const target: RestartTarget | null =
                      service.name === 'API Server' ? 'api' :
                      service.name === 'Web App'    ? 'web' : null
                    return (
                      <ServiceCard
                        key={service.name}
                        service={service}
                        capabilities={report.capabilities}
                        isOwner={isOwner}
                        busyAction={busyAction}
                        history={history[service.name] ?? []}
                        expanded={!!expandedCards[service.name]}
                        onToggleExpand={() => toggleExpand(service.name)}
                        onReconnect={() => handleReconnectDb(service)}
                        onRecheck={() => handleRecheck(service)}
                        onRestart={() => target && handleRestart(service, target)}
                        onGc={() => handleGc(service)}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Action feedback log */}
          {feedback.length > 0 && (
            <div
              className="rounded-xl border mb-6 overflow-hidden"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <Info size={14} style={{ color: 'var(--color-primary)' }} />
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    Recent actions
                  </h3>
                </div>
                <button
                  onClick={() => setFeedback([])}
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Clear
                </button>
              </div>
              <div>
                {feedback.map(f => (
                  <div
                    key={f.ts}
                    className="px-5 py-2.5 border-b last:border-0 flex items-center gap-3"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {f.ok
                      ? <CheckCircle size={14} style={{ color: '#16A34A', flexShrink: 0 }} />
                      : <XCircle size={14} style={{ color: '#DC2626', flexShrink: 0 }} />}
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-text)', minWidth: 110 }}>
                      {f.service}
                    </span>
                    <span className="text-xs flex-1" style={{ color: 'var(--color-text-muted)' }}>
                      {f.message}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(f.ts).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Server metrics */}
          <div
            className="rounded-xl border p-5 mb-4"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <MemoryStick size={16} style={{ color: 'var(--color-primary)' }} />
              <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>API Server resources</h2>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full ml-1"
                style={{ background: 'var(--color-page)', color: 'var(--color-text-muted)' }}>
                v{report.process.apiVersion} · pid {report.process.pid}
              </span>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Memory column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <MemoryMeter
                  used={report.memoryMB.used}
                  total={report.memoryMB.total}
                  percent={report.memoryMB.percent}
                />
                <StatRow label="RSS" value={`${report.memoryMB.rssMB} MB`} />
                <StatRow label="External" value={`${report.memoryMB.externalMB} MB`} />
                <StatRow label="Array buffers" value={`${report.memoryMB.arrayBuffersMB} MB`} />
              </div>
              {/* Event loop + CPU */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Event loop lag</span>
                    <span
                      className="text-xs font-bold"
                      style={{
                        color: report.eventLoop.lagP99Ms > 250 ? '#DC2626' : report.eventLoop.lagP99Ms > 50 ? '#D97706' : '#16A34A',
                      }}
                    >
                      p99 {report.eventLoop.lagP99Ms} ms
                    </span>
                  </div>
                  <Sparkline data={history['API Server'] ?? []} color={'#2563EB'} />
                </div>
                <StatRow label="Loop mean" value={`${report.eventLoop.lagMeanMs} ms`} />
                <StatRow label="Loop max" value={`${report.eventLoop.lagMaxMs} ms`} />
                <StatRow label="CPU cores" value={String(report.cpu.coreCount)} />
                <StatRow
                  label="Load avg"
                  value={`${report.cpu.loadAvg1} / ${report.cpu.loadAvg5} / ${report.cpu.loadAvg15}`}
                />
              </div>
              {/* Runtime */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <StatRow label="Process" value={<span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#DCFCE7', color: '#16A34A' }}>Running</span>} />
                <StatRow label="Uptime" value={formatUptime(report.serverUptimeSeconds)} />
                <StatRow label="Started" value={new Date(report.process.startedAt).toLocaleString()} />
                <StatRow label="Node" value={report.process.nodeVersion} />
                <StatRow label="Platform" value={`${report.process.platform}/${report.process.arch}`} />
                <StatRow label="Active handles" value={String(report.process.activeHandles)} />
                <StatRow label="Active requests" value={String(report.process.activeRequests)} />
                <StatRow
                  label="CPU (user/sys)"
                  value={`${Math.round(report.cpu.user / 1000)} / ${Math.round(report.cpu.system / 1000)} ms`}
                />
              </div>
            </div>
          </div>

          {/* Control plane capabilities banner */}
          <div
            className="rounded-xl border p-4 mb-4 flex flex-wrap gap-4 items-center justify-between"
            style={{ background: 'var(--color-page)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2">
              <Cpu size={16} style={{ color: 'var(--color-primary)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Control plane</span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <span>API restart: <strong style={{ color: 'var(--color-text)' }}>{RESTART_LABEL[report.capabilities.canRestartApi]}</strong></span>
              <span>Web restart: <strong style={{ color: 'var(--color-text)' }}>{RESTART_LABEL[report.capabilities.canRestartWeb]}</strong></span>
              <span>Force GC: <strong style={{ color: 'var(--color-text)' }}>{report.capabilities.canForceGc ? 'Available' : 'Disabled'}</strong></span>
              <span>DB reconnect: <strong style={{ color: 'var(--color-text)' }}>Available</strong></span>
              {!isOwner && (
                <span style={{ color: '#D97706' }}>Restart actions require OWNER role</span>
              )}
            </div>
          </div>

          {/* Incident log */}
          {report.services.some(s => s.status !== 'healthy') && (
            <div
              className="rounded-xl border overflow-hidden"
              style={{ background: 'var(--color-surface)', borderColor: '#FBBF24' }}
            >
              <div
                className="px-5 py-3 border-b flex items-center gap-2"
                style={{ background: '#FFFBEB', borderColor: '#FBBF24' }}
              >
                <AlertTriangle size={15} style={{ color: '#D97706' }} />
                <h3 className="text-sm font-semibold" style={{ color: '#92400E' }}>Active incidents</h3>
              </div>
              {report.services.filter(s => s.status !== 'healthy').map(s => (
                <div
                  key={s.name}
                  className="px-5 py-3 border-b last:border-0 flex items-center justify-between gap-4"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{s.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{s.message}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div
          className="rounded-xl border p-12 text-center"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <Server size={36} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px' }} />
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>Could not reach the API</p>
          <p className="text-sm mt-1 mb-4" style={{ color: 'var(--color-text-muted)' }}>
            The API server may be starting up. This page works without it — click refresh once it&apos;s back.
          </p>
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--color-primary)', color: '#fff', opacity: loading ? 0.7 : 1 }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
