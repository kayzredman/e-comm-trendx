'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { courierApi, courierAuth, type CourierJob, type CourierProfile } from '@/lib/courier-api'
import { CourierGate, CourierTabBar } from '../_components'
import { currencySymbol } from '@/lib/utils'

type Filter = 'all' | 'pickup' | 'transit'

export default function JobsPage() {
  return (
    <CourierGate>
      <JobsInner />
    </CourierGate>
  )
}

function JobsInner() {
  const router = useRouter()
  const [jobs, setJobs] = useState<CourierJob[] | null>(null)
  const [profile, setProfile] = useState<CourierProfile | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState<string | null>(null)
  const [online, setOnline] = useState(true)

  useEffect(() => { setProfile(courierAuth.getProfile()) }, [])

  async function load() {
    try {
      const data = await courierApi.jobs()
      setJobs(data); setError(null)
    } catch (err) {
      const msg = (err as Error).message
      if (msg === 'NO_SESSION') router.replace('/courier')
      else setError(msg)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 20_000)
    return () => clearInterval(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const all = jobs ?? []
  const assigned = all.filter(j => j.status === 'ASSIGNED')
  const transit = all.filter(j => j.status === 'PICKED_UP')
  const shown = filter === 'all' ? all : filter === 'pickup' ? assigned : transit

  const initials = (profile?.name ?? 'C').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="cr-shell">
      <header className="cr-appbar">
        <div className="cr-avatar">{initials}</div>
        <div>
          <h1 style={{ fontSize: 15 }}>Hi, {profile?.name?.split(' ')[0] ?? 'Courier'}</h1>
          <div className="cr-sub">{online ? 'Online · ready for jobs' : 'Offline'}</div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          className={`cr-toggle ${online ? '' : 'cr-off'}`}
          onClick={() => setOnline(o => !o)}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span>{online ? 'Online' : 'Offline'}</span>
          <span className="cr-switch" />
        </button>
      </header>

      <div className="cr-body" style={{ paddingTop: 14 }}>
        <div className="cr-hero">
          <div>
            <div className="cr-label">Active jobs</div>
            <div className="cr-count">{all.length}</div>
            <div className="cr-hero-sub">{assigned.length} to pick up · {transit.length} in transit</div>
          </div>
          <div className="cr-live-badge"><span className="cr-livedot" />LIVE</div>
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          <Pill active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={all.length} />
          <Pill active={filter === 'pickup'} onClick={() => setFilter('pickup')} label="Pickup" count={assigned.length} />
          <Pill active={filter === 'transit'} onClick={() => setFilter('transit')} label="In transit" count={transit.length} />
        </div>

        {error && <div className="cr-error">{error}</div>}

        {!jobs ? (
          <>
            <div className="cr-skel" style={{ height: 140 }} />
            <div className="cr-skel" style={{ height: 140 }} />
          </>
        ) : shown.length === 0 ? (
          <div className="cr-empty">
            <div className="cr-empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" />
              </svg>
            </div>
            <div className="cr-empty-h">No active jobs</div>
            <div className="cr-empty-s">New deliveries assigned by dispatch will appear here.</div>
          </div>
        ) : (
          shown.map(j => <JobCard key={j.assignmentId} job={j} />)
        )}
      </div>

      <CourierTabBar active="jobs" />
    </div>
  )
}

function Pill({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px', borderRadius: 999,
        background: active ? '#0A0A0B' : '#fff',
        color: active ? '#fff' : '#6B7280',
        border: `1px solid ${active ? '#0A0A0B' : '#E5E7EB'}`,
        fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
        cursor: 'pointer', font: 'inherit',
      }}
    >
      {label}
      <span style={{
        marginLeft: 6,
        background: active ? 'rgba(255,255,255,.2)' : '#E5E7EB',
        color: active ? '#fff' : '#0A0A0B',
        padding: '1px 7px', borderRadius: 999, fontSize: 10,
      }}>{count}</span>
    </button>
  )
}

function JobCard({ job }: { job: CourierJob }) {
  const cust = job.customer
  const initials = cust?.name?.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() ?? '?'
  const isTransit = job.status === 'PICKED_UP'
  const cardClass = isTransit ? 'cr-card cr-transit' : 'cr-card cr-priority'
  const pillClass = isTransit ? 'cr-pill cr-transit-pill' : 'cr-pill cr-assigned'
  const pillText = isTransit ? 'Out for delivery' : 'Pickup ready'
  const codPending = job.order?.paymentMethod === 'CASH_ON_DELIVERY' && job.order?.paymentStatus !== 'PAID'

  return (
    <Link href={`/courier/jobs/${job.orderId}`} className={cardClass} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="cr-row">
        <span className="cr-id">#{job.orderId.slice(-8).toUpperCase()}</span>
        <span className={pillClass}>{pillText}</span>
      </div>
      <div className="cr-cust">
        <div className="cr-avatar">{initials}</div>
        <div>
          <div className="cr-name">{cust?.name ?? 'Customer'}</div>
          <div className="cr-phone">{cust?.phone ?? '—'}</div>
        </div>
      </div>
      <div className="cr-addr">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
        </svg>
        <div>
          <div className="cr-text">{cust?.address?.street ?? '—'}, {cust?.address?.city ?? ''}</div>
          <div className="cr-zone">{job.zone?.name ?? cust?.address?.region ?? ''}</div>
        </div>
      </div>
      <div className="cr-foot">
        <div className="cr-payout">
          <span className="cr-payout-label">Your earn</span>
          <span className="cr-amount">{currencySymbol()} {Number(job.commissionAmount).toFixed(2)}</span>
        </div>
        {codPending
          ? <span className="cr-cod">COD {currencySymbol()} {Number(job.order?.total ?? 0).toFixed(0)}</span>
          : <span className="cr-go cr-go-cobalt">Open</span>}
      </div>
    </Link>
  )
}
