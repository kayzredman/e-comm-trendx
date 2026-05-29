'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { courierApi, type EarningsPayload } from '@/lib/courier-api'
import { CourierGate, CourierTabBar } from '../_components'

export default function EarningsPage() {
  return (
    <CourierGate>
      <Inner />
    </CourierGate>
  )
}

function Inner() {
  const router = useRouter()
  const [data, setData] = useState<EarningsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    courierApi.earnings()
      .then(setData)
      .catch(err => {
        const m = (err as Error).message
        if (m === 'NO_SESSION') router.replace('/courier')
        else setError(m)
      })
  }, [router])

  if (error) return <div className="cr-shell"><div className="cr-body"><div className="cr-error">{error}</div></div><CourierTabBar active="earnings" /></div>
  if (!data) return (
    <div className="cr-shell">
      <header className="cr-appbar"><h1>Earnings</h1></header>
      <div className="cr-body">
        <div className="cr-skel" style={{ height: 130 }} />
        <div className="cr-skel" style={{ height: 80 }} />
        <div className="cr-skel" style={{ height: 200 }} />
      </div>
      <CourierTabBar active="earnings" />
    </div>
  )

  const from = new Date(data.cycle.from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const to = new Date(data.cycle.to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  return (
    <div className="cr-shell">
      <header className="cr-appbar">
        <Link href="/courier/jobs" className="cr-back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </Link>
        <div>
          <h1>Earnings</h1>
          <div className="cr-sub">{from} – {to}</div>
        </div>
      </header>

      <div className="cr-body" style={{ paddingTop: 18 }}>
        <div className="cr-earn-hero">
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .85 }}>Earned this cycle</div>
          <div className="cr-earn-amount">GH₵ {Number(data.cycle.earned).toFixed(2)}</div>
          <div style={{ fontSize: 12, opacity: .85 }}>{data.cycle.delivered} deliveries · {data.cycle.failed} failed</div>
          {Number(data.owed) > 0 && (
            <span className="cr-earn-pill">GH₵ {Number(data.owed).toFixed(2)} owed · next payout</span>
          )}
        </div>

        <div className="cr-kpi-row">
          <div className="cr-kpi"><div className="cr-kpi-num">{data.cycle.delivered}</div><div className="cr-kpi-lbl">Delivered</div></div>
          <div className="cr-kpi"><div className="cr-kpi-num">{data.cycle.failed}</div><div className="cr-kpi-lbl">Failed</div></div>
          <div className="cr-kpi"><div className="cr-kpi-num">GH₵{Number(data.cycle.revenue).toFixed(0)}</div><div className="cr-kpi-lbl">Revenue</div></div>
        </div>

        {data.lastPayout && (
          <div style={{ padding: 14, borderRadius: 14, background: '#FEF3C7', border: '1px solid #FCD34D', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.5"/></svg>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#78350F' }}>Last payout: GH₵ {Number(data.lastPayout.amount).toFixed(2)}</div>
                <div style={{ fontSize: 11, color: '#92400E', marginTop: 2 }}>
                  {data.lastPayout.method} · {new Date(data.lastPayout.paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {data.lastPayout.deliveryCount} deliveries
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="cr-section-h">Recent deliveries</div>

        {data.recent.length === 0
          ? <div className="cr-empty"><div className="cr-empty-h">Nothing yet</div><div className="cr-empty-s">Completed deliveries will show here.</div></div>
          : data.recent.map(r => (
              <div key={r.assignmentId} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: "'SF Mono',Menlo,monospace", fontSize: 12, color: '#6B7280', fontWeight: 600 }}>#{r.orderId.slice(-8).toUpperCase()}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                    {r.deliveredAt ? new Date(r.deliveredAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#047857', fontVariantNumeric: 'tabular-nums' }}>+ GH₵ {Number(r.amount).toFixed(2)}</div>
              </div>
            ))}
      </div>

      <CourierTabBar active="earnings" />
    </div>
  )
}
