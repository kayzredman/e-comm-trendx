'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { healthApi, type HealthReport, type ServiceCheck, type ServiceStatus } from '@/lib/api'
import {
  CheckCircle, AlertTriangle, XCircle, RefreshCw, Database,
  Server, Shield, Globe, Zap, Clock, Activity, MemoryStick,
} from 'lucide-react'

interface Props {
  initialReport: HealthReport | null
  token: string
}

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  healthy:  { label: 'Healthy',  color: '#16A34A', bg: '#DCFCE7', icon: CheckCircle },
  degraded: { label: 'Degraded', color: '#D97706', bg: '#FEF3C7', icon: AlertTriangle },
  down:     { label: 'Down',     color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
}

const SERVICE_ICONS: Record<string, typeof Server> = {
  'PostgreSQL':   Database,
  'API Server':   Server,
  'Clerk Auth':   Shield,
  'Storefront':   Globe,
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

function ServiceCard({ service, onReconnect, reconnecting }: {
  service: ServiceCheck
  onReconnect?: () => void
  reconnecting?: boolean
}) {
  const Icon = SERVICE_ICONS[service.name] ?? Server
  const cfg = STATUS_CONFIG[service.status]
  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-4"
      style={{
        background: 'var(--color-surface)',
        borderColor: service.status !== 'healthy' ? cfg.color + '40' : 'var(--color-border)',
        boxShadow: service.status === 'down' ? `0 0 0 2px ${cfg.color}20` : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: cfg.bg }}>
            <Icon size={20} style={{ color: cfg.color }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{service.name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {new Date(service.checkedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <StatusBadge status={service.status} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <UptimeRing status={service.status} />
        <div style={{ flex: 1, paddingLeft: 16 }}>
          <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>{service.message}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={12} style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Latency</span>
            <LatencyBar ms={service.latencyMs} />
          </div>
        </div>
      </div>

      {/* Proactive action for degraded/down services */}
      {service.status !== 'healthy' && onReconnect && (
        <button
          onClick={onReconnect}
          disabled={reconnecting}
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-semibold transition-colors"
          style={{
            background: cfg.bg,
            color: cfg.color,
            opacity: reconnecting ? 0.6 : 1,
            cursor: reconnecting ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={13} className={reconnecting ? 'animate-spin' : ''} />
          {reconnecting ? 'Reconnecting…' : 'Attempt reconnect'}
        </button>
      )}
    </div>
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

export default function ServiceQualityClient({ initialReport, token }: Props) {
  const [report, setReport] = useState<HealthReport | null>(initialReport)
  const [loading, setLoading] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [countdown, setCountdown] = useState(30)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const handleReconnectDb = async () => {
    setReconnecting(true)
    try {
      await healthApi.reconnectDb(token)
      await refresh()
    } finally {
      setReconnecting(false)
    }
  }

  const overall = report?.overall ?? 'down'
  const overallCfg = STATUS_CONFIG[overall]
  const OverallIcon = overallCfg.icon

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
            Real-time monitoring for all TrendMarga services
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Auto-refresh toggle */}
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
          {/* Manual refresh */}
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
      <div
        className="rounded-xl border p-4 mb-6 flex items-center gap-4"
        style={{
          background: overallCfg.bg,
          borderColor: overallCfg.color + '40',
        }}
      >
        <OverallIcon size={28} style={{ color: overallCfg.color, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p className="font-bold text-base" style={{ color: overallCfg.color }}>
            {overall === 'healthy' ? 'All systems operational' :
             overall === 'degraded' ? 'Some services are degraded' :
             'Critical: Services are down'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: overallCfg.color + 'cc' }}>
            Last checked: {lastRefresh.toLocaleTimeString()}
            {report && ` · Uptime: ${Math.floor(report.serverUptimeSeconds / 3600)}h ${Math.floor((report.serverUptimeSeconds % 3600) / 60)}m`}
          </p>
        </div>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: overallCfg.color, fontSize: 12 }}>
            <RefreshCw size={14} className="animate-spin" />
            Checking…
          </div>
        )}
      </div>

      {/* Service cards grid */}
      {report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 mb-6">
            {report.services.map(service => (
              <ServiceCard
                key={service.name}
                service={service}
                onReconnect={service.name === 'PostgreSQL' ? handleReconnectDb : undefined}
                reconnecting={reconnecting && service.name === 'PostgreSQL'}
              />
            ))}
          </div>

          {/* Server metrics */}
          <div
            className="rounded-xl border p-5"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <MemoryStick size={16} style={{ color: 'var(--color-primary)' }} />
              <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Server Resources</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <MemoryMeter
                used={report.memoryMB.used}
                total={report.memoryMB.total}
                percent={report.memoryMB.percent}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Process uptime</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                    {Math.floor(report.serverUptimeSeconds / 3600)}h {Math.floor((report.serverUptimeSeconds % 3600) / 60)}m {report.serverUptimeSeconds % 60}s
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Node.js process</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#DCFCE7', color: '#16A34A' }}>Running</span>
                </div>
              </div>
            </div>
          </div>

          {/* Incident log — shows degraded/down services */}
          {report.services.some(s => s.status !== 'healthy') && (
            <div
              className="rounded-xl border mt-4 overflow-hidden"
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
            The API server may be starting up. Click refresh to try again.
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
