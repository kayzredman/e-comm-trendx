'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { payoutsApi, type Payout, type PayoutSummary, type PayoutMethod } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { Wallet, Coins, Send, X, Loader2 } from 'lucide-react'

export default function PayoutsClient({
  initialSummary, initialRecent,
}: { initialSummary: PayoutSummary | null; initialRecent: Payout[] }) {
  const { getToken } = useAuth()
  const [summary, setSummary] = useState<PayoutSummary | null>(initialSummary)
  const [recent, setRecent] = useState<Payout[]>(initialRecent)
  const [payingFor, setPayingFor] = useState<{ id: string; name: string; amount: string } | null>(null)
  const [method, setMethod] = useState<PayoutMethod>('MOMO')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const totalOwed = summary?.couriers.reduce((a, c) => a + Number(c.owed), 0) ?? 0
  const totalDeliveries = summary?.couriers.reduce((a, c) => a + c.deliveries, 0) ?? 0
  const totalRevenue = summary?.couriers.reduce((a, c) => a + Number(c.revenue), 0) ?? 0
  const owingCount = summary?.couriers.filter(c => Number(c.owed) > 0).length ?? 0

  async function refresh() {
    const token = await getToken(); if (!token) return
    const [s, r] = await Promise.all([
      payoutsApi.summary(token),
      payoutsApi.recent(token),
    ])
    setSummary(s); setRecent(r)
  }

  async function pay() {
    if (!payingFor) return
    setSaving(true); setErr(null)
    try {
      const token = await getToken(); if (!token) throw new Error('Not signed in')
      await payoutsApi.pay(payingFor.id, { method, reference: reference || undefined, notes: notes || undefined }, token)
      setPayingFor(null); setReference(''); setNotes('')
      await refresh()
    } catch (e: any) {
      setErr(e?.message ?? 'Payout failed')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi label="Total owed" value={formatPrice(totalOwed)} sub={`${owingCount} courier${owingCount !== 1 ? 's' : ''} owed`} accent="amber" />
        <Kpi label="Period deliveries" value={String(totalDeliveries)} sub="this period" accent="cobalt" />
        <Kpi label="Period revenue" value={formatPrice(totalRevenue)} sub="delivery fees collected" accent="emerald" />
        <Kpi label="Roster" value={String(summary?.couriers.length ?? 0)} sub="active couriers" accent="cobalt" />
      </div>

      <div className="rounded-xl border overflow-hidden mb-6" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
          <Wallet size={16} style={{ color: '#1E40AF' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Pay couriers</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--color-surface-muted)' }}>
              <Th>Courier</Th>
              <Th>Type</Th>
              <Th align="right">Deliveries</Th>
              <Th align="right">Revenue</Th>
              <Th align="right">Owed</Th>
              <Th align="right"></Th>
            </tr>
          </thead>
          <tbody>
            {(!summary || summary.couriers.length === 0) && (
              <tr><td colSpan={6} className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                No active couriers.
              </td></tr>
            )}
            {summary?.couriers.map(({ courier, deliveries, revenue, owed }) => {
              const owe = Number(owed)
              return (
                <tr key={courier.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <Td>
                    <div className="font-semibold" style={{ color: 'var(--color-text)' }}>{courier.name}</div>
                    <div className="text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>{courier.momoNumber ?? courier.phone}</div>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={courier.employmentType === 'FLEET'
                        ? { background: '#DBEAFE', color: '#1E40AF' }
                        : { background: '#ECFDF5', color: '#059669' }}>
                      {courier.employmentType === 'FLEET' ? 'FLEET' : `FREELANCE · ${Number(courier.commissionPct)}%`}
                    </span>
                  </Td>
                  <Td align="right" mono>{deliveries}</Td>
                  <Td align="right" mono>{formatPrice(revenue)}</Td>
                  <Td align="right" mono>
                    <span style={{ fontWeight: 700, color: owe > 0 ? '#9A3412' : 'var(--color-text-muted)' }}>{formatPrice(owed)}</span>
                  </Td>
                  <Td align="right">
                    <button
                      disabled={owe <= 0}
                      onClick={() => { setPayingFor({ id: courier.id, name: courier.name, amount: owed }); setMethod(courier.momoNumber ? 'MOMO' : 'CASH') }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: owe > 0 ? '#1E40AF' : '#E2E8F0', color: owe > 0 ? '#fff' : '#94A3B8' }}
                    >
                      <Send size={12} /> Pay
                    </button>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
          <Coins size={16} style={{ color: '#059669' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Recent payouts</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--color-surface-muted)' }}>
              <Th>Paid at</Th>
              <Th>Courier</Th>
              <Th>Method</Th>
              <Th>Reference</Th>
              <Th align="right">Deliveries</Th>
              <Th align="right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                No payouts yet.
              </td></tr>
            )}
            {recent.map(p => (
              <tr key={p.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                <Td>{new Date(p.paidAt).toLocaleString()}</Td>
                <Td>{p.courier?.name ?? p.courierId.slice(0, 8)}</Td>
                <Td><span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: '#F1F5F9', color: '#475569' }}>{p.method}</span></Td>
                <Td><span className="font-mono text-xs">{p.reference ?? '—'}</span></Td>
                <Td align="right" mono>{p.deliveryCount}</Td>
                <Td align="right" mono><strong>{formatPrice(p.amount)}</strong></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {payingFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#fff' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Wallet size={18} /> Pay {payingFor.name}
              </h3>
              <button onClick={() => setPayingFor(null)} className="p-1 rounded hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="p-4 rounded-xl mb-4" style={{ background: '#EFF6FF' }}>
              <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#1E40AF' }}>Payout amount</div>
              <div className="text-3xl font-extrabold mt-1" style={{ color: '#1E40AF', fontVariantNumeric: 'tabular-nums' }}>{formatPrice(payingFor.amount)}</div>
            </div>
            <label className="block mb-3">
              <span className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text)' }}>Method</span>
              <select value={method} onChange={e => setMethod(e.target.value as PayoutMethod)}
                className="w-full p-2.5 rounded-lg border text-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}>
                <option value="MOMO">Mobile Money</option>
                <option value="CASH">Cash</option>
                <option value="BANK">Bank transfer</option>
              </select>
            </label>
            <label className="block mb-3">
              <span className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text)' }}>Reference (optional)</span>
              <input value={reference} onChange={e => setReference(e.target.value)}
                placeholder="MoMo txn ID, voucher #, etc."
                className="w-full p-2.5 rounded-lg border text-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }} />
            </label>
            <label className="block mb-3">
              <span className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text)' }}>Notes (optional)</span>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                className="w-full p-2.5 rounded-lg border text-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }} />
            </label>
            {err && <div className="mb-3 text-xs px-3 py-2 rounded" style={{ background: '#FEE2E2', color: '#991B1B' }}>{err}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setPayingFor(null)} className="px-4 py-2 rounded-lg text-sm font-semibold border" style={{ borderColor: 'var(--color-border)' }}>Cancel</button>
              <button disabled={saving} onClick={pay} className="px-4 py-2 rounded-lg text-sm font-bold inline-flex items-center gap-1.5"
                style={{ background: '#059669', color: '#fff' }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Confirm payout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Th({ children, align }: { children?: React.ReactNode; align?: 'right' }) {
  return <th className="text-[10px] uppercase tracking-wider font-bold px-3 py-3" style={{ color: 'var(--color-text-muted)', textAlign: align ?? 'left' }}>{children}</th>
}
function Td({ children, align, mono }: { children: React.ReactNode; align?: 'right'; mono?: boolean }) {
  return <td className="px-3 py-3" style={{ textAlign: align ?? 'left', fontVariantNumeric: mono ? 'tabular-nums' : undefined }}>{children}</td>
}
function Kpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: 'cobalt' | 'emerald' | 'amber' }) {
  const c = accent === 'emerald' ? '#059669' : accent === 'amber' ? '#B45309' : '#1E40AF'
  return (
    <div className="p-4 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: c }}>{label}</div>
      <div className="text-2xl font-extrabold tracking-tight mt-1.5" style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{sub}</div>
    </div>
  )
}
