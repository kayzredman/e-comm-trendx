'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { paymentVerificationsApi, type PaymentVerification } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { Check, X, Loader2, ShieldCheck, Clock, Coins } from 'lucide-react'

type Stats = {
  pending: { count: number; amount: string }
  verifiedToday: { count: number; amount: string }
}

export default function VerifyPaymentsClient({
  initial, initialStats,
}: { initial: PaymentVerification[]; initialStats: Stats }) {
  const { getToken } = useAuth()
  const [rows, setRows] = useState<PaymentVerification[]>(initial)
  const [stats, setStats] = useState<Stats>(initialStats)
  const [working, setWorking] = useState<string | null>(null)
  const [rejectFor, setRejectFor] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  async function refresh() {
    const token = await getToken()
    if (!token) return
    const [a, b] = await Promise.all([
      paymentVerificationsApi.list(token),
      paymentVerificationsApi.stats(token),
    ])
    setRows(a); setStats(b)
  }

  async function confirm(id: string) {
    setWorking(id)
    try {
      const token = await getToken(); if (!token) return
      await paymentVerificationsApi.confirm(id, token)
      setRows(prev => prev.filter(r => r.id !== id))
      await refresh()
    } finally { setWorking(null) }
  }

  async function reject() {
    if (!rejectFor || !reason.trim()) return
    setWorking(rejectFor)
    try {
      const token = await getToken(); if (!token) return
      await paymentVerificationsApi.reject(rejectFor, reason.trim(), token)
      setRows(prev => prev.filter(r => r.id !== rejectFor))
      setRejectFor(null); setReason('')
      await refresh()
    } finally { setWorking(null) }
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <Kpi label="Pending" value={String(stats.pending.count)} sub={`worth ${formatPrice(stats.pending.amount)}`} accent="amber" icon={<Clock size={16} />} />
        <Kpi label="Verified today" value={String(stats.verifiedToday.count)} sub={`released ${formatPrice(stats.verifiedToday.amount)}`} accent="emerald" icon={<ShieldCheck size={16} />} />
        <Kpi label="Pending value" value={formatPrice(stats.pending.amount)} sub="MoMo proofs awaiting check" accent="cobalt" icon={<Coins size={16} />} />
      </div>

      <div className="space-y-3">
        {rows.length === 0 && (
          <div className="p-10 rounded-xl text-center text-sm border border-dashed"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
            All clear — no payments waiting for verification.
          </div>
        )}
        {rows.map(v => (
          <div key={v.id} className="rounded-xl border p-4 md:p-5"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>
                    Pending
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: '#DBEAFE', color: '#1E40AF' }}>
                    {v.provider.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="font-bold text-base" style={{ color: 'var(--color-text)' }}>
                  Order #{v.orderId.slice(0, 8)}
                  {v.order?.customer?.name && (
                    <span className="font-normal text-sm" style={{ color: 'var(--color-text-muted)' }}> · {v.order.customer.name}</span>
                  )}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Submitted {new Date(v.createdAt).toLocaleString()}
                </div>
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                  <Cell label="Amount" value={formatPrice(v.amount)} mono bold />
                  <Cell label="Provider ref" value={v.providerRef ?? '—'} mono />
                  <Cell label="From phone" value={v.fromPhone ?? '—'} mono />
                  <Cell label="Order total" value={v.order ? formatPrice(v.order.total) : '—'} mono />
                </dl>
                {v.screenshotUrl && (
                  <a href={v.screenshotUrl} target="_blank" rel="noreferrer"
                    className="inline-block mt-3 text-xs font-semibold" style={{ color: '#1E40AF' }}>
                    View screenshot →
                  </a>
                )}
              </div>
              <div className="flex md:flex-col gap-2 md:w-44">
                <button
                  disabled={working === v.id}
                  onClick={() => confirm(v.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold"
                  style={{ background: '#059669', color: '#fff' }}
                >
                  {working === v.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirm payment
                </button>
                <button
                  disabled={working === v.id}
                  onClick={() => { setRejectFor(v.id); setReason('') }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border"
                  style={{ borderColor: '#DC2626', color: '#DC2626', background: '#FFF' }}
                >
                  <X size={14} /> Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reject modal */}
      {rejectFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#fff' }}>
            <h3 className="text-lg font-extrabold mb-1" style={{ color: 'var(--color-text)' }}>Reject payment</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Customer will be notified. Give a short reason.
            </p>
            <textarea
              value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="No matching MoMo transaction found"
              className="w-full p-2.5 rounded-lg border text-sm"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setRejectFor(null)} className="px-4 py-2 rounded-lg text-sm font-semibold border" style={{ borderColor: 'var(--color-border)' }}>Cancel</button>
              <button disabled={!reason.trim() || working === rejectFor} onClick={reject}
                className="px-4 py-2 rounded-lg text-sm font-bold inline-flex items-center gap-1.5"
                style={{ background: '#DC2626', color: '#fff' }}>
                {working === rejectFor ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Cell({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div style={{ color: 'var(--color-text)', fontVariantNumeric: mono ? 'tabular-nums' : undefined, fontWeight: bold ? 700 : 500 }}>{value}</div>
    </div>
  )
}

function Kpi({ label, value, sub, accent, icon }: { label: string; value: string; sub: string; accent: 'cobalt' | 'emerald' | 'amber'; icon: React.ReactNode }) {
  const c = accent === 'emerald' ? '#059669' : accent === 'amber' ? '#B45309' : '#1E40AF'
  return (
    <div className="p-4 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold" style={{ color: c }}>{icon}{label}</div>
      <div className="text-2xl font-extrabold tracking-tight mt-1.5" style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{sub}</div>
    </div>
  )
}
