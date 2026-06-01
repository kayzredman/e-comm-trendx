'use client'

import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  healthApi,
  type HealthReport,
  type ServiceCheck,
  type ServiceStatus,
  type ServiceKind,
  type RestartTarget,
  type RestartMethod,
  type UserRole,
  type DiagnosticsReport,
  type DiagnosticFinding,
  type FindingSeverity,
} from '@/lib/api'
import {
  CheckCircle, AlertTriangle, XCircle, RefreshCw, Database,
  Server, Shield, Globe, Zap, Clock, Activity, MemoryStick,
  Power, Recycle, WifiOff, Cpu, Info, ChevronDown, ChevronUp,
  Layers, Network, ShoppingBag, Stethoscope, ClipboardCopy, X,
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
  'PostgreSQL':              Database,
  'Schema':                  Layers,
  'API Server':              Server,
  'Web App':                 Globe,
  'Storefront':              ShoppingBag,
  'Clerk Auth':              Shield,
  'Paystack API':            Zap,
  'Paystack Webhook':        Network,
  'Payment Reconciliation':  Recycle,
}

const KIND_META: Record<ServiceKind, { label: string; icon: typeof Server; color: string }> = {
  self:     { label: 'Application',  icon: Cpu,      color: '#2563EB' },
  database: { label: 'Data',         icon: Database, color: '#7C3AED' },
  http:     { label: 'Frontend',     icon: Network,  color: '#0EA5E9' },
  auth:     { label: 'External',     icon: Shield,   color: '#F59E0B' },
  payment:  { label: 'Payments',     icon: Zap,      color: '#F97316' },
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

const SEVERITY_CFG: Record<FindingSeverity, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  critical: { label: 'Critical', color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
  warning:  { label: 'Warning',  color: '#D97706', bg: '#FEF3C7', icon: AlertTriangle },
  info:     { label: 'Info',     color: '#2563EB', bg: '#DBEAFE', icon: Info },
}

function FindingCard({
  finding, copiedCmd, onCopy, service, capabilities, isOwner, busyAction,
  onRecheck, onReconnectDb, onForceGc,
}: {
  finding: DiagnosticFinding
  copiedCmd: string | null
  onCopy: (cmd: string) => void
  service: ServiceCheck | null
  capabilities: HealthReport['capabilities'] | null
  isOwner: boolean
  busyAction: string | null
  onRecheck: (svc: ServiceCheck) => void
  onReconnectDb: (svc: ServiceCheck) => void
  onForceGc: (svc: ServiceCheck) => void
}) {
  const cfg = SEVERITY_CFG[finding.severity]
  const Icon = cfg.icon
  const busy = (a: string) => service ? busyAction === `${service.name}:${a}` : false

  // Decide which existing safe actions apply to this finding.
  const showRecheck     = !!service
  const showReconnect   = !!service && (service.name === 'PostgreSQL' || service.name === 'Schema')
  const showGc          = !!service && finding.id === 'mem-heap-high' && !!capabilities?.canForceGc
  const hasInlineActions = showRecheck || showReconnect || showGc
  return (
    <div
      className="rounded-lg border p-4"
      style={{
        background: 'var(--color-surface)',
        borderColor: cfg.color + '40',
        borderLeft: `3px solid ${cfg.color}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
          style={{ background: cfg.bg }}
        >
          <Icon size={16} style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.color }}>
              {cfg.label}
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: 'var(--color-page)', color: 'var(--color-text-muted)' }}>
              {finding.service}
            </span>
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {finding.title}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            {finding.message}
          </p>
          <div
            className="mt-2 p-2 rounded text-xs"
            style={{ background: 'var(--color-page)', color: 'var(--color-text)', lineHeight: 1.5 }}
          >
            <strong style={{ color: 'var(--color-text)' }}>Suggested fix: </strong>
            {finding.suggestion}
          </div>
          {finding.command && (() => {
            const cmd = finding.command
            return (
              <div
                className="mt-2 flex items-center gap-2 p-2 rounded font-mono text-xs"
                style={{ background: '#0F172A', color: '#E2E8F0' }}
              >
                <span style={{ flex: 1, overflow: 'auto' }}>$ {cmd}</span>
                <button
                  type="button"
                  onClick={() => onCopy(cmd)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold shrink-0"
                  style={{
                    background: copiedCmd === cmd ? '#16A34A' : '#334155',
                    color: 'white',
                  }}
                  title="Copy command"
                >
                  <ClipboardCopy size={10} />
                  {copiedCmd === cmd ? 'Copied' : 'Copy'}
                </button>
              </div>
            )
          })()}
          {finding.docsHint && (
            <p className="text-[10px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
              {finding.docsHint}
            </p>
          )}
          {hasInlineActions && service && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {showRecheck && (
                <button
                  type="button"
                  onClick={() => onRecheck(service)}
                  disabled={busy('recheck')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                    opacity: busy('recheck') ? 0.6 : 1,
                  }}
                  title={`Re-probe ${service.name}`}
                >
                  <RefreshCw size={11} className={busy('recheck') ? 'animate-spin' : ''} />
                  {busy('recheck') ? 'Rechecking…' : 'Recheck'}
                </button>
              )}
              {showReconnect && isOwner && (
                <button
                  type="button"
                  onClick={() => onReconnectDb(service)}
                  disabled={busy('reconnectDb')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border"
                  style={{
                    background: '#FEF3C7',
                    borderColor: '#F59E0B',
                    color: '#92400E',
                    opacity: busy('reconnectDb') ? 0.6 : 1,
                  }}
                  title="Reconnect database pool"
                >
                  <RefreshCw size={11} className={busy('reconnectDb') ? 'animate-spin' : ''} />
                  {busy('reconnectDb') ? 'Reconnecting…' : 'Reconnect DB'}
                </button>
              )}
              {showGc && isOwner && (
                <button
                  type="button"
                  onClick={() => onForceGc(service)}
                  disabled={busy('gc')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                    opacity: busy('gc') ? 0.6 : 1,
                  }}
                  title="Force V8 garbage collection"
                >
                  <RefreshCw size={11} className={busy('gc') ? 'animate-spin' : ''} />
                  {busy('gc') ? 'Collecting…' : 'Force GC'}
                </button>
              )}
              {!isOwner && (showReconnect || showGc) && (
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  (Reconnect / GC require OWNER role)
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DiagnosticsPanel({
  report, running, error, copiedCmd, isOwner, capabilities, busyAction,
  findServiceFromReport,
  onCopy, onRerun, onClose,
  onRecheckService, onReconnectDb, onForceGc,
}: {
  report: DiagnosticsReport | null
  running: boolean
  error: string | null
  copiedCmd: string | null
  isOwner: boolean
  capabilities: HealthReport['capabilities'] | null
  busyAction: string | null
  findServiceFromReport: (name: string) => ServiceCheck | null
  onCopy: (cmd: string) => void
  onRerun: () => void
  onClose: () => void
  onRecheckService: (svc: ServiceCheck) => void
  onReconnectDb: (svc: ServiceCheck) => void
  onForceGc: (svc: ServiceCheck) => void
}) {
  const allClear = report && report.summary.total === 0
  return (
    <div
      className="rounded-xl border mb-6 overflow-hidden"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-page)' }}
      >
        <div className="flex items-center gap-2">
          <Stethoscope size={16} style={{ color: 'var(--color-primary)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
            Diagnostics
          </h2>
          {report && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
              {new Date(report.ranAt).toLocaleTimeString()} · {report.durationMs}ms
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRerun}
            disabled={running}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
              opacity: running ? 0.6 : 1,
            }}
          >
            <RefreshCw size={11} className={running ? 'animate-spin' : ''} />
            {running ? 'Running…' : 'Re-run'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md border"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
            aria-label="Close diagnostics"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {running && !report && (
          <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
            <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
            <p className="text-sm">Running all checks…</p>
          </div>
        )}

        {!running && !report && error && (
          <div
            className="rounded-lg border p-4"
            style={{ background: '#FEF2F2', borderColor: '#FCA5A5' }}
          >
            <div className="flex items-start gap-3">
              <XCircle size={20} style={{ color: '#DC2626' }} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#991B1B' }}>
                  Diagnostics could not run
                </p>
                <p className="text-xs mt-1" style={{ color: '#7F1D1D', lineHeight: 1.5 }}>
                  {error}
                </p>
                <p className="text-[11px] mt-2" style={{ color: '#991B1B' }}>
                  Tip: if you&apos;re on local dev, restart the API (<span style={{ fontFamily: 'monospace' }}>pnpm --filter @trendmarga/api dev</span>) so it picks up the new
                  <span style={{ fontFamily: 'monospace' }}> POST /health/diagnostics</span> route. Otherwise check API logs and your role (OWNER / MANAGER required).
                </p>
                <button
                  type="button"
                  onClick={onRerun}
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border"
                  style={{ background: 'white', borderColor: '#FCA5A5', color: '#991B1B' }}
                >
                  <RefreshCw size={11} />
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {report && (
          <>
            {/* Summary chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              <SummaryChip label="Critical" count={report.summary.critical} color="#DC2626" bg="#FEE2E2" />
              <SummaryChip label="Warning"  count={report.summary.warning}  color="#D97706" bg="#FEF3C7" />
              <SummaryChip label="Info"     count={report.summary.info}     color="#2563EB" bg="#DBEAFE" />
              <SummaryChip
                label="Healthy services"
                count={report.summary.healthyServices}
                total={report.summary.totalServices}
                color="#16A34A" bg="#DCFCE7"
              />
            </div>

            {allClear ? (
              <div
                className="rounded-lg border p-4 flex items-center gap-3"
                style={{ background: '#F0FDF4', borderColor: '#86EFAC' }}
              >
                <CheckCircle size={20} style={{ color: '#16A34A' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#15803D' }}>
                    No issues detected
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#166534' }}>
                    All services are healthy and no cross-cutting checks fired.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {report.findings.map(f => (
                  <FindingCard
                    key={f.id}
                    finding={f}
                    copiedCmd={copiedCmd}
                    onCopy={onCopy}
                    service={findServiceFromReport(f.service)}
                    capabilities={capabilities}
                    isOwner={isOwner}
                    busyAction={busyAction}
                    onRecheck={onRecheckService}
                    onReconnectDb={onReconnectDb}
                    onForceGc={onForceGc}
                  />
                ))}
              </div>
            )}

            <p className="text-[11px] mt-4" style={{ color: 'var(--color-text-muted)' }}>
              Inline actions (Recheck / Reconnect / GC) reuse existing safe controls. One-click
              remediation for missing env vars, restarts, and re-seeding is a planned Tier 2
              enhancement (see TrendMarga-Plan.md).
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function SummaryChip({ label, count, total, color, bg }: {
  label: string
  count: number
  total?: number
  color: string
  bg: string
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
      style={{ background: bg, color }}
    >
      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>
        {count}{total !== undefined ? `/${total}` : ''}
      </span>
      <span style={{ opacity: 0.85 }}>{label}</span>
    </div>
  )
}

export default function ServiceQualityClient({ initialReport, token, currentRole }: Props) {
  const { getToken } = useAuth()
  // Always fetch a fresh Clerk token before each call. The SSR `token` prop is a one-shot
  // snapshot — Clerk tokens expire (~60s), so reusing it causes 401 on subsequent actions.
  const freshToken = useCallback(async (): Promise<string> => {
    try {
      const t = await getToken()
      return t ?? token
    } catch {
      return token
    }
  }, [getToken, token])
  const [report, setReport] = useState<HealthReport | null>(initialReport)
  const [loading, setLoading] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [countdown, setCountdown] = useState(30)
  const [feedback, setFeedback] = useState<ActionFeedback[]>([])
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({ 'API Server': true })
  const [history, setHistory] = useState<Record<string, number[]>>({})
  const [diagnostics, setDiagnostics] = useState<DiagnosticsReport | null>(null)
  const [diagRunning, setDiagRunning] = useState(false)
  const [diagOpen, setDiagOpen] = useState(false)
  const [diagError, setDiagError] = useState<string | null>(null)
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)
  const [restartFlow, setRestartFlow] = useState<{
    open: boolean
    target: RestartTarget | null
    running: boolean
    logs: Array<{ ts: number; level: 'info' | 'ok' | 'warn' | 'error'; text: string }>
    finalStatus: 'success' | 'partial' | 'fail' | null
  }>({ open: false, target: null, running: false, logs: [], finalStatus: null })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Set initial timestamp on the client only to avoid SSR hydration mismatch.
  // Also rehydrate any in-flight restart flow (the page may have been reloaded
  // by next-watch touching next.config.ts) so the modal stays visible.
  useEffect(() => {
    setLastRefresh(new Date())
    try {
      const raw = sessionStorage.getItem('trendx:restartFlow')
      if (!raw) return
      const saved = JSON.parse(raw) as typeof restartFlow & { savedAt?: number }
      if (!saved || !saved.open) return
      // If the page reloaded while running, the JS that drives the poll is dead —
      // mark it as orphaned but keep the logs visible so the admin can read them.
      if (saved.running) {
        const extra = {
          ts: (saved.logs.at(-1)?.ts ?? 0) + 1,
          level: 'warn' as const,
          text: 'Page reloaded mid-restart (next-watch). Run another probe from the dashboard once it returns.',
        }
        setRestartFlow({ ...saved, running: false, finalStatus: 'partial', logs: [...saved.logs, extra] })
      } else {
        setRestartFlow(saved)
      }
    } catch {
      // ignore corrupt cache
    }
  }, [])

  // Mirror restart flow into sessionStorage so it survives a Next dev reload.
  useEffect(() => {
    try {
      if (restartFlow.open) {
        sessionStorage.setItem('trendx:restartFlow', JSON.stringify({ ...restartFlow, savedAt: Date.now() }))
      } else {
        sessionStorage.removeItem('trendx:restartFlow')
      }
    } catch {
      // storage full / disabled — non-fatal
    }
  }, [restartFlow])

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
      const data = await healthApi.services(await freshToken())
      setReport(data)
      setLastRefresh(new Date())
      setCountdown(30)
    } catch {
      // API might be restarting
    } finally {
      setLoading(false)
    }
  }, [freshToken])

  // Supervisor state — written by scripts/dev-supervisor.sh (pnpm dev:safe)
  const [supervisor, setSupervisor] = useState<{
    present: boolean
    status?: string
    restarts?: number
    lastEventUnix?: number
    lastExitCode?: number
  } | null>(null)
  const refreshSupervisor = useCallback(async () => {
    try {
      const s = await healthApi.supervisor(await freshToken())
      setSupervisor(s)
    } catch {
      setSupervisor(null)
    }
  }, [freshToken])
  useEffect(() => { refreshSupervisor() }, [refreshSupervisor])
  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(refreshSupervisor, 15_000)
    return () => clearInterval(t)
  }, [autoRefresh, refreshSupervisor])

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
        const res = await healthApi.reconnectDb(await freshToken())
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
        const res = await healthApi.recheck(await freshToken(), service.name)
        updateSingleService(res)
        pushFeedback({ service: service.name, ok: res.status !== 'down', message: `Rechecked — ${res.message}` })
      } catch (err: unknown) {
        pushFeedback({ service: service.name, ok: false, message: errMsg(err, 'Recheck failed') })
      }
    })

  const handleGc = (service: ServiceCheck) =>
    runWithBusy(`${service.name}:gc`, async () => {
      try {
        const res = await healthApi.gc(await freshToken())
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
        const res = await healthApi.restart(await freshToken(), target)
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

  const handleRunDiagnostics = async () => {
    setDiagRunning(true)
    setDiagOpen(true)
    setDiagError(null)
    try {
      const res = await healthApi.diagnostics(await freshToken())
      setDiagnostics(res)
      pushFeedback({
        service: 'Diagnostics',
        ok: res.summary.critical === 0,
        message: `${res.summary.total} finding${res.summary.total === 1 ? '' : 's'} · ${res.summary.critical} critical · ${res.summary.warning} warning · ${res.summary.info} info (${res.durationMs}ms)`,
      })
      // Also refresh the per-service tiles so they reflect the latest probes.
      void refresh()
    } catch (err: unknown) {
      const msg = errMsg(err, 'Diagnostics failed')
      setDiagError(msg)
      pushFeedback({ service: 'Diagnostics', ok: false, message: msg })
    } finally {
      setDiagRunning(false)
    }
  }

  // ─── Orchestrated restart-with-verify flow ──────────────────────────────
  // Triggers a restart of the chosen target and then polls /health/services
  // until that service comes back healthy (or the timeout elapses), streaming
  // each step into a log panel so operators can SEE what's happening.
  const handleRestartFlow = async (target: RestartTarget) => {
    const serviceName = target === 'web' ? 'Web App' : 'API Server'
    const label = target === 'web' ? 'Web' : 'API'
    if (!confirm(`Restart the ${label} service?\n\nIt will briefly go offline. This page will show live logs.`)) return

    const startedAt = Date.now()
    const logs: Array<{ ts: number; level: 'info' | 'ok' | 'warn' | 'error'; text: string }> = []
    const push = (level: 'info' | 'ok' | 'warn' | 'error', text: string) => {
      logs.push({ ts: Date.now() - startedAt, level, text })
      setRestartFlow(s => ({ ...s, logs: [...logs] }))
    }

    setRestartFlow({ open: true, target, running: true, logs: [], finalStatus: null })
    push('info', `Restart requested for ${label} service`)

    try {
      const t = await freshToken()
      push('info', `POST /health/services/restart { target: "${target}" }`)
      const res = await healthApi.restart(t, target)
      push(res.ok ? 'ok' : 'error', `[${res.method}] ${res.message}`)
      if (!res.ok) {
        setRestartFlow(s => ({ ...s, running: false, finalStatus: 'fail', logs: [...logs] }))
        pushFeedback({ service: serviceName, ok: false, message: `Restart failed: ${res.message}` })
        return
      }

      const waitMs = target === 'web' ? 3000 : 4000
      push('info', `Waiting ${waitMs / 1000}s for ${label} to come back…`)
      await new Promise(r => setTimeout(r, waitMs))

      // Poll up to 30s, every 2s, recheck-ing the target then refreshing the full report.
      const maxAttempts = 15
      let attempt = 0
      let targetHealthy = false
      let lastStatus: ServiceStatus = 'down'

      while (attempt < maxAttempts) {
        attempt++
        try {
          push('info', `Probe ${attempt}/${maxAttempts}: re-checking ${serviceName}…`)
          const recheck = await healthApi.recheck(await freshToken(), serviceName)
          lastStatus = recheck.status
          if (recheck.status === 'healthy') {
            push('ok', `${serviceName} → healthy (${recheck.latencyMs ?? '—'}ms)`)
            targetHealthy = true
            break
          } else {
            push('warn', `${serviceName} → ${recheck.status} (${recheck.message})`)
          }
        } catch (err) {
          push('warn', `Probe failed: ${errMsg(err, 'unknown')}`)
        }
        if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 2000))
      }

      if (!targetHealthy) {
        push('error', `${serviceName} did not return to healthy after ${maxAttempts * 2}s (last: ${lastStatus})`)
        setRestartFlow(s => ({ ...s, running: false, finalStatus: 'fail', logs: [...logs] }))
        pushFeedback({ service: serviceName, ok: false, message: `Restart timed out` })
        void refresh()
        return
      }

      // Final verification: pull the full report and confirm overall health.
      push('info', 'Final verification: GET /health/services')
      const full = await healthApi.services(await freshToken())
      setReport(full)
      const down = full.services.filter(s => s.status === 'down')
      const degraded = full.services.filter(s => s.status === 'degraded')

      if (down.length === 0 && degraded.length === 0) {
        push('ok', `OK — all ${full.services.length} services up and verified`)
        setRestartFlow(s => ({ ...s, running: false, finalStatus: 'success', logs: [...logs] }))
        pushFeedback({ service: serviceName, ok: true, message: 'Restart complete — all systems healthy' })
      } else {
        if (down.length > 0) push('warn', `${down.length} service(s) still down: ${down.map(s => s.name).join(', ')}`)
        if (degraded.length > 0) push('warn', `${degraded.length} service(s) degraded: ${degraded.map(s => s.name).join(', ')}`)
        push('ok', `${serviceName} is back, but other services are not 100%`)
        setRestartFlow(s => ({ ...s, running: false, finalStatus: 'partial', logs: [...logs] }))
        pushFeedback({ service: serviceName, ok: true, message: `${serviceName} restarted (others degraded)` })
      }
    } catch (err: unknown) {
      push('error', errMsg(err, 'Restart flow failed'))
      setRestartFlow(s => ({ ...s, running: false, finalStatus: 'fail', logs: [...logs] }))
      pushFeedback({ service: serviceName, ok: false, message: errMsg(err, 'Restart flow failed') })
    }
  }

  const handleRestartAll = async () => {
    const startedAt = Date.now()
    const logs: Array<{ ts: number; level: 'info' | 'ok' | 'warn' | 'error'; text: string }> = []
    const push = (level: 'info' | 'ok' | 'warn' | 'error', text: string) => {
      logs.push({ ts: Date.now() - startedAt, level, text })
      setRestartFlow(s => ({ ...s, logs: [...logs] }))
    }
    setRestartFlow({ open: true, target: 'web', running: true, logs: [], finalStatus: null })
    push('info', 'Restart EVERYTHING (api + web) requested')
    try {
      const t = await freshToken()
      push('info', 'POST /health/services/restart-all')
      const res = await healthApi.restartAll(t)
      push(res.api.ok ? 'ok' : 'error', `api: [${res.api.method}] ${res.api.message}`)
      push(res.web.ok ? 'ok' : 'error', `web: [${res.web.method}] ${res.web.message}`)
      if (!res.api.ok && !res.web.ok) {
        setRestartFlow(s => ({ ...s, running: false, finalStatus: 'fail', logs: [...logs] }))
        pushFeedback({ service: 'stack', ok: false, message: 'Restart-all failed for both api & web' })
        return
      }
      push('info', 'Waiting 5s for stack to come back…')
      await new Promise(r => setTimeout(r, 5000))
      let attempt = 0
      while (attempt < 15) {
        attempt++
        try {
          push('info', `Probe ${attempt}/15: GET /health/services`)
          const full = await healthApi.services(await freshToken())
          setReport(full)
          const down = full.services.filter(s => s.status === 'down')
          if (down.length === 0) {
            push('ok', `Stack back up — ${full.services.length}/${full.services.length} services healthy`)
            setRestartFlow(s => ({ ...s, running: false, finalStatus: 'success', logs: [...logs] }))
            pushFeedback({ service: 'stack', ok: true, message: 'Restart-all complete' })
            await refreshSupervisor()
            return
          }
          push('warn', `Still down: ${down.map(s => s.name).join(', ')}`)
        } catch (err) {
          push('warn', `Probe failed: ${errMsg(err, 'unknown')}`)
        }
        await new Promise(r => setTimeout(r, 2000))
      }
      push('error', 'Stack did not return within 35s')
      setRestartFlow(s => ({ ...s, running: false, finalStatus: 'partial', logs: [...logs] }))
    } catch (err: unknown) {
      push('error', errMsg(err, 'Restart-all flow failed'))
      setRestartFlow(s => ({ ...s, running: false, finalStatus: 'fail', logs: [...logs] }))
    }
  }

  const copyCommand = async (cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd)
      setCopiedCmd(cmd)
      setTimeout(() => setCopiedCmd(c => (c === cmd ? null : c)), 1500)
    } catch {
      // best-effort
    }
  }

  const overall = report?.overall ?? 'down'
  const overallCfg = STATUS_CONFIG[overall]
  const OverallIcon = overallCfg.icon

  // Group services by kind for sectioned rendering
  const groupedServices = useMemo(() => {
    if (!report) return [] as Array<{ kind: ServiceKind; services: ServiceCheck[] }>
    const order: ServiceKind[] = ['self', 'database', 'http', 'auth', 'payment']
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
  const capabilities = report?.capabilities ?? null

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
            Real-time monitoring & control plane for all trendMarga services
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {supervisor && (
            <span
              title={
                supervisor.present
                  ? `Supervisor ${supervisor.status ?? '?'} · restarts=${supervisor.restarts ?? 0}${supervisor.lastExitCode ? ` · last exit ${supervisor.lastExitCode}` : ''}`
                  : 'Supervisor not running. Use `pnpm dev:safe` for auto-restart.'
              }
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{
                background: supervisor.present ? '#DCFCE7' : '#FEF3C7',
                color:      supervisor.present ? '#166534' : '#92400E',
                border:     `1px solid ${supervisor.present ? '#86EFAC' : '#FDE68A'}`,
              }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: supervisor.present ? '#16A34A' : '#D97706',
              }} />
              {supervisor.present
                ? `Supervisor · restarts ${supervisor.restarts ?? 0}`
                : 'No supervisor (pnpm dev:safe)'}
            </span>
          )}
          <button
            type="button"
            onClick={handleRestartAll}
            disabled={restartFlow.running || !isOwner || !capabilities || (capabilities.canRestartApi === 'unsupported' && capabilities.canRestartWeb === 'unsupported')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border"
            style={{
              background: restartFlow.running ? '#FEE2E2' : '#DC2626',
              borderColor: '#B91C1C',
              color: restartFlow.running ? '#991B1B' : 'white',
              opacity: (restartFlow.running || !isOwner) ? 0.7 : 1,
              cursor: restartFlow.running ? 'wait' : 'pointer',
            }}
            title={!isOwner ? 'OWNER role required' : 'Restart api + web together'}
          >
            <Power size={13} className={restartFlow.running ? 'animate-pulse' : ''} />
            {restartFlow.running ? 'Restarting stack…' : 'Restart Everything'}
          </button>
          <button
            type="button"
            onClick={() => handleRestartFlow('web')}
            disabled={restartFlow.running || !capabilities || capabilities.canRestartWeb === 'unsupported'}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border"
            style={{
              background: restartFlow.running ? '#FEF3C7' : '#FFFFFF',
              borderColor: '#F97316',
              color: '#9A3412',
              opacity: (restartFlow.running || !capabilities || capabilities.canRestartWeb === 'unsupported') ? 0.6 : 1,
              cursor: restartFlow.running ? 'wait' : 'pointer',
            }}
            title={
              !capabilities
                ? 'Health report not loaded'
                : capabilities.canRestartWeb === 'unsupported'
                ? 'Web restart not supported in this environment'
                : `Restart web (${RESTART_LABEL[capabilities.canRestartWeb]})`
            }
          >
            <Power size={13} className={restartFlow.running && restartFlow.target === 'web' ? 'animate-pulse' : ''} />
            {restartFlow.running && restartFlow.target === 'web' ? 'Restarting web…' : 'Restart Web'}
          </button>
          <button
            type="button"
            onClick={handleRunDiagnostics}
            disabled={diagRunning}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border"
            style={{
              background: 'var(--color-primary)',
              borderColor: 'var(--color-primary)',
              color: 'white',
              opacity: diagRunning ? 0.7 : 1,
              cursor: diagRunning ? 'wait' : 'pointer',
            }}
          >
            <Stethoscope size={13} className={diagRunning ? 'animate-pulse' : ''} />
            {diagRunning ? 'Running…' : 'Run Diagnostics'}
          </button>
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

      {/* Diagnostics findings panel */}
      {diagOpen && (
        <DiagnosticsPanel
          report={diagnostics}
          running={diagRunning}
          error={diagError}
          copiedCmd={copiedCmd}
          isOwner={isOwner}
          capabilities={report?.capabilities ?? null}
          busyAction={busyAction}
          findServiceFromReport={(name) => report?.services.find(s => s.name === name) ?? null}
          onCopy={copyCommand}
          onRerun={handleRunDiagnostics}
          onClose={() => setDiagOpen(false)}
          onRecheckService={(svc) => handleRecheck(svc)}
          onReconnectDb={(svc) => handleReconnectDb(svc)}
          onForceGc={(svc) => handleGc(svc)}
        />
      )}

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

      {restartFlow.open && (
        <RestartFlowModal
          state={restartFlow}
          onClose={() => {
            if (restartFlow.running) return
            setRestartFlow({ open: false, target: null, running: false, logs: [], finalStatus: null })
          }}
        />
      )}
    </div>
  )
}

// ─── Restart-with-verify modal ───────────────────────────────────────────
function RestartFlowModal({
  state,
  onClose,
}: {
  state: {
    open: boolean
    target: RestartTarget | null
    running: boolean
    logs: Array<{ ts: number; level: 'info' | 'ok' | 'warn' | 'error'; text: string }>
    finalStatus: 'success' | 'partial' | 'fail' | null
  }
  onClose: () => void
}) {
  const logRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [state.logs])

  const label = state.target === 'web' ? 'Web' : state.target === 'api' ? 'API' : ''
  const banner = state.running
    ? { icon: RefreshCw, text: `Restarting ${label}…`, color: '#2563EB', bg: '#DBEAFE', spin: true }
    : state.finalStatus === 'success'
    ? { icon: CheckCircle, text: 'OK — all services up and verified', color: '#16A34A', bg: '#DCFCE7', spin: false }
    : state.finalStatus === 'partial'
    ? { icon: AlertTriangle, text: `${label} restarted (other services not 100%)`, color: '#D97706', bg: '#FEF3C7', spin: false }
    : { icon: XCircle, text: `${label} restart failed`, color: '#DC2626', bg: '#FEE2E2', spin: false }
  const BannerIcon = banner.icon

  const levelStyles: Record<'info' | 'ok' | 'warn' | 'error', { color: string; prefix: string }> = {
    info:  { color: '#64748B', prefix: '·' },
    ok:    { color: '#16A34A', prefix: '✓' },
    warn:  { color: '#D97706', prefix: '!' },
    error: { color: '#DC2626', prefix: '✗' },
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)', borderRadius: 12,
          width: '100%', maxWidth: 720, maxHeight: '85vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Power size={15} style={{ color: '#F97316' }} />
            Restart {label} — live log
          </h3>
          <button
            onClick={onClose}
            disabled={state.running}
            aria-label="Close"
            style={{
              padding: 4, borderRadius: 6, border: 'none',
              background: 'transparent', cursor: state.running ? 'not-allowed' : 'pointer',
              color: 'var(--color-text-muted)', opacity: state.running ? 0.4 : 1,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            margin: 18, padding: '12px 14px', borderRadius: 10,
            background: banner.bg, border: `1px solid ${banner.color}40`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <BannerIcon size={20} style={{ color: banner.color }} className={banner.spin ? 'animate-spin' : ''} />
          <span style={{ fontWeight: 600, color: banner.color, fontSize: 14 }}>{banner.text}</span>
        </div>

        <div
          ref={logRef}
          style={{
            margin: '0 18px 18px', padding: 12, borderRadius: 8,
            background: '#0F172A', color: '#E2E8F0',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 12, lineHeight: 1.55,
            overflowY: 'auto', flex: 1, minHeight: 200, maxHeight: 380,
            border: '1px solid #1E293B',
          }}
        >
          {state.logs.length === 0 ? (
            <div style={{ color: '#64748B' }}>Waiting for output…</div>
          ) : (
            state.logs.map((l, i) => {
              const ls = levelStyles[l.level]
              const t = (l.ts / 1000).toFixed(1).padStart(5, ' ')
              return (
                <div key={i} style={{ display: 'flex', gap: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  <span style={{ color: '#475569', flexShrink: 0 }}>{t}s</span>
                  <span style={{ color: ls.color, flexShrink: 0, width: 12 }}>{ls.prefix}</span>
                  <span style={{ color: ls.color === '#64748B' ? '#CBD5E1' : ls.color }}>{l.text}</span>
                </div>
              )
            })
          )}
        </div>

        <div
          style={{
            padding: '12px 18px', borderTop: '1px solid var(--color-border)',
            display: 'flex', justifyContent: 'flex-end', gap: 8,
          }}
        >
          <button
            onClick={onClose}
            disabled={state.running}
            style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: state.running ? 'var(--color-border)' : 'var(--color-primary)',
              color: state.running ? 'var(--color-text-muted)' : '#fff',
              border: 'none', cursor: state.running ? 'not-allowed' : 'pointer',
            }}
          >
            {state.running ? 'Working…' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
