'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { courierApi, type CourierJob } from '@/lib/courier-api'
import { CourierGate, CourierTabBar } from '../_components'
import { currencySymbol } from '@/lib/utils'

export default function HistoryPage() {
  return (
    <CourierGate>
      <Inner />
    </CourierGate>
  )
}

function Inner() {
  const router = useRouter()
  const [jobs, setJobs] = useState<CourierJob[] | null>(null)

  useEffect(() => {
    courierApi.history()
      .then(setJobs)
      .catch(err => { if ((err as Error).message === 'NO_SESSION') router.replace('/courier') })
  }, [router])

  return (
    <div className="cr-shell">
      <header className="cr-appbar">
        <Link href="/courier/jobs" className="cr-back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </Link>
        <div><h1>History</h1><div className="cr-sub">Last 14 days</div></div>
      </header>

      <div className="cr-body">
        {!jobs ? (
          <><div className="cr-skel" style={{ height: 80 }} /><div className="cr-skel" style={{ height: 80 }} /></>
        ) : jobs.length === 0 ? (
          <div className="cr-empty"><div className="cr-empty-h">No history yet</div><div className="cr-empty-s">Completed deliveries appear here.</div></div>
        ) : (
          jobs.map(j => {
            const ok = j.status === 'DELIVERED'
            return (
              <div key={j.assignmentId} className="cr-card">
                <div className="cr-row">
                  <span className="cr-id">#{j.orderId.slice(-8).toUpperCase()}</span>
                  <span className={`cr-pill ${ok ? 'cr-delivered' : 'cr-failed'}`}>{j.status}</span>
                </div>
                <div className="cr-cust">
                  <div className="cr-avatar">{j.customer?.name?.[0]?.toUpperCase() ?? '?'}</div>
                  <div>
                    <div className="cr-name">{j.customer?.name ?? '—'}</div>
                    <div className="cr-phone">{j.customer?.address?.city ?? ''} · {j.zone?.name ?? ''}</div>
                  </div>
                </div>
                <div className="cr-foot">
                  <span style={{ fontSize: 11, color: '#6B7280' }}>
                    {(j.deliveredAt ?? j.failedAt ?? j.assignedAt) && new Date(j.deliveredAt ?? j.failedAt ?? j.assignedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {ok && <span className="cr-amount" style={{ fontSize: 14 }}>+ {currencySymbol()} {Number(j.commissionAmount).toFixed(2)}</span>}
                </div>
              </div>
            )
          })
        )}
      </div>

      <CourierTabBar active="history" />
    </div>
  )
}
