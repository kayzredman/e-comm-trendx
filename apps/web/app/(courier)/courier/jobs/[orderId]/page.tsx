'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { courierApi, type CourierJobDetail } from '@/lib/courier-api'
import { CourierGate } from '../../_components'

export default function JobDetailPage() {
  return (
    <CourierGate>
      <DetailInner />
    </CourierGate>
  )
}

function DetailInner() {
  const router = useRouter()
  const params = useParams<{ orderId: string }>()
  const orderId = params?.orderId as string

  const [job, setJob] = useState<CourierJobDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [failOpen, setFailOpen] = useState(false)
  const [reason, setReason] = useState('')

  async function load() {
    try { setJob(await courierApi.job(orderId)); setError(null) }
    catch (err) {
      const m = (err as Error).message
      if (m === 'NO_SESSION') router.replace('/courier')
      else setError(m)
    }
  }
  useEffect(() => { load() }, [orderId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function doPickup() {
    setBusy(true); setError(null)
    try { await courierApi.pickup(orderId); await load() }
    catch (err) { setError((err as Error).message) }
    finally { setBusy(false) }
  }

  async function submitFail() {
    if (!reason.trim()) { setError('Reason required'); return }
    setBusy(true); setError(null)
    try { await courierApi.fail(orderId, reason); router.replace('/courier/jobs') }
    catch (err) { setError((err as Error).message); setBusy(false) }
  }

  if (!job) {
    return (
      <div className="cr-shell">
        <header className="cr-appbar">
          <Link href="/courier/jobs" className="cr-back">←</Link>
          <h1>Loading…</h1>
        </header>
        <div className="cr-body">
          <div className="cr-skel" style={{ height: 110 }} />
          <div className="cr-skel" style={{ height: 150 }} />
          <div className="cr-skel" style={{ height: 200 }} />
        </div>
      </div>
    )
  }

  const cust = job.customer
  const initials = cust?.name?.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() ?? '?'
  const isAssigned = job.status === 'ASSIGNED'
  const isTransit = job.status === 'PICKED_UP'
  const codPending = job.order?.paymentMethod === 'CASH_ON_DELIVERY' && job.order?.paymentStatus !== 'PAID'
  const total = Number(job.order?.total ?? 0)
  const addr = cust?.address
  const phoneDigits = cust?.phone?.replace(/[^\d+]/g, '') ?? ''
  const mapQuery = addr ? encodeURIComponent(`${addr.street}, ${addr.city}, ${addr.region}, ${addr.country}`) : ''

  return (
    <div className="cr-shell">
      <header className="cr-appbar">
        <Link href="/courier/jobs" className="cr-back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </Link>
        <div>
          <h1>Job #{orderId.slice(-8).toUpperCase()}</h1>
          <div className="cr-sub">{isAssigned ? 'Ready to pick up' : isTransit ? 'Out for delivery' : job.status}</div>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 200 }}>
        <div style={{ padding: '18px 20px', background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div className="cr-avatar" style={{ width: 48, height: 48, fontSize: 16 }}>{initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{cust?.name ?? 'Customer'}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{cust?.phone}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <a href={`tel:${phoneDigits}`} style={{ height: 42, borderRadius: 12, background: '#10B981', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>
              Call
            </a>
            <a href={`https://wa.me/${phoneDigits.replace('+', '')}`} target="_blank" rel="noreferrer" style={{ height: 42, borderRadius: 12, background: '#25D366', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
              WhatsApp
            </a>
          </div>
        </div>

        <div className="cr-body" style={{ padding: '14px 16px', gap: 12 }}>
          <div className="cr-card">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.06em' }}>Drop-off address</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <svg style={{ flexShrink: 0, color: '#F97316', width: 18, height: 18, marginTop: 2 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <div>
                <div style={{ fontSize: 14, color: '#0F172A', lineHeight: 1.5, fontWeight: 500 }}>
                  {addr?.street}, {addr?.city}
                  {addr?.zip ? `, ${addr.zip}` : ''}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {addr?.region}{job.zone ? ` · ${job.zone.name}` : ''}
                </div>
                {job.order?.notes && (
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 6, fontStyle: 'italic', paddingTop: 6, borderTop: '1px dashed #E5E7EB' }}>
                    "{job.order.notes}"
                  </div>
                )}
                {mapQuery && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noreferrer"
                     style={{ display: 'inline-flex', gap: 5, alignItems: 'center', marginTop: 10, padding: '7px 12px', background: '#EFF6FF', color: '#1E40AF', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3h7v7"/><path d="M21 3l-9 9"/><path d="M21 14v7H3V3h7"/></svg>
                    Open in Maps
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="cr-card">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.06em' }}>Items ({job.items.length})</div>
            {job.items.map(it => (
              <div key={it.id} className="cr-line-item">
                <span style={{ color: '#0F172A', fontWeight: 500 }}>
                  {it.productName}
                  {it.variantLabel && <span className="cr-li-qty"> · {it.variantLabel}</span>}
                  <span className="cr-li-qty">× {it.quantity}</span>
                </span>
                <span className="cr-li-price">GH₵ {(Number(it.unitPrice) * it.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="cr-line-item">
              <span style={{ color: '#6B7280', fontSize: 12 }}>Delivery</span>
              <span className="cr-li-price">GH₵ {Number(job.order?.deliveryFee ?? 0).toFixed(2)}</span>
            </div>
            <div className="cr-line-total">
              <span>Total</span>
              <span>GH₵ {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="cr-card">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.06em' }}>Payment</div>
            <div className={`cr-pay-status ${codPending ? 'cr-pay-cod' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                {codPending
                  ? <span>Collect <strong>GH₵ {total.toFixed(2)}</strong> on delivery</span>
                  : <span>Paid · {job.order?.paymentMethod === 'MOBILE_MONEY' ? 'MoMo ✓' : 'Card ✓'}</span>
                }
              </div>
              <span className="cr-pay-badge">{codPending ? 'COD' : 'PAID'}</span>
            </div>
          </div>
        </div>

        {error && <div className="cr-error" style={{ margin: '0 16px' }}>{error}</div>}
      </div>

      <div className="cr-action-bar" style={{ position: 'sticky', bottom: 0, margin: 0, maxWidth: 480 }}>
        {isAssigned && (
          <>
            <button className="cr-btn" onClick={doPickup} disabled={busy}>
              {busy ? 'Updating…' : 'Mark picked up'}
            </button>
            <button className="cr-btn cr-danger-outline cr-small" onClick={() => setFailOpen(true)} disabled={busy}>
              Report problem
            </button>
          </>
        )}
        {isTransit && (
          <>
            <button className="cr-btn cr-emerald" onClick={() => setVerifyOpen(true)} disabled={busy}>
              Verify code & deliver
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </button>
            <button className="cr-btn cr-danger-outline cr-small" onClick={() => setFailOpen(true)} disabled={busy}>
              Report failed delivery
            </button>
          </>
        )}
        {!isAssigned && !isTransit && (
          <div className="cr-info">This job is {job.status.toLowerCase()}.</div>
        )}
      </div>

      {verifyOpen && (
        <VerifyCodeModal
          orderId={orderId}
          customerName={cust?.name ?? 'Customer'}
          customerPhone={cust?.phone ?? ''}
          onClose={() => setVerifyOpen(false)}
          onSuccess={() => router.replace('/courier/jobs')}
        />
      )}

      {failOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setFailOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px calc(28px + env(safe-area-inset-bottom))', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ width: 40, height: 4, background: '#E5E7EB', borderRadius: 2, margin: '-8px auto 4px' }} />
            <div style={{ fontSize: 18, fontWeight: 800 }}>Report a problem</div>
            <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>Tell dispatch what went wrong. The job will be marked failed.</div>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Customer not reachable, wrong address, refused parcel…"
              rows={4}
              style={{ width: '100%', padding: 12, borderRadius: 12, border: '1.5px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
            />
            {error && <div className="cr-error">{error}</div>}
            <button className="cr-btn" style={{ background: '#E11D48', boxShadow: '0 8px 20px rgba(225,29,72,.25)' }} onClick={submitFail} disabled={busy}>
              {busy ? 'Submitting…' : 'Mark as failed'}
            </button>
            <button className="cr-btn cr-outline cr-small" onClick={() => setFailOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function VerifyCodeModal({
  orderId, customerName, customerPhone, onClose, onSuccess,
}: { orderId: string; customerName: string; customerPhone: string; onClose: () => void; onSuccess: () => void }) {
  const [code, setCode] = useState(['', '', '', ''])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => { setTimeout(() => inputs.current[0]?.focus(), 100) }, [])

  function setDigit(i: number, v: string) {
    const d = v.replace(/\D/g, '').slice(-1)
    const next = [...code]; next[i] = d; setCode(next)
    if (d && i < 3) inputs.current[i + 1]?.focus()
  }

  async function confirm() {
    const joined = code.join('')
    if (joined.length !== 4) { setError('Enter all 4 digits'); return }
    setBusy(true); setError(null)
    try {
      await courierApi.deliver(orderId, joined)
      onSuccess()
    } catch (err) {
      setError((err as Error).message)
      setCode(['', '', '', ''])
      inputs.current[0]?.focus()
      setBusy(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(180deg,#ECFDF5 0%,#fff 60%)', borderRadius: '24px 24px 0 0', padding: '20px 24px calc(28px + env(safe-area-inset-bottom))', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, background: '#D1D5DB', borderRadius: 2, margin: '-4px auto 4px' }} />
        <div style={{ width: 64, height: 64, borderRadius: 18, background: '#10B981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px auto 8px', boxShadow: '0 10px 26px rgba(16,185,129,.3)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', letterSpacing: '-.01em' }}>Ask {customerName.split(' ')[0]} for the code</div>
        <div style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 1.5 }}>
          She received a 4-digit code by SMS when the order shipped. Enter it to confirm hand-off.
        </div>
        <div style={{ fontSize: 12, color: '#0F172A', textAlign: 'center', fontWeight: 700 }}>{customerName} · {customerPhone}</div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: '8px 0 4px' }}>
          {code.map((d, i) => (
            <input
              key={i}
              ref={el => { inputs.current[i] = el }}
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => setDigit(i, e.target.value)}
              onKeyDown={e => { if (e.key === 'Backspace' && !d && i > 0) inputs.current[i - 1]?.focus() }}
              style={{
                width: 56, height: 68, borderRadius: 14,
                background: '#fff', border: `1.5px solid ${d ? '#10B981' : '#E5E7EB'}`,
                fontSize: 28, fontWeight: 800,
                color: d ? '#047857' : '#0F172A',
                textAlign: 'center', outline: 'none', fontFamily: 'inherit',
              }}
            />
          ))}
        </div>

        {error && <div className="cr-error">{error}</div>}

        <button className="cr-btn cr-emerald" onClick={confirm} disabled={busy || code.join('').length !== 4}>
          {busy ? 'Confirming…' : 'Confirm delivered'}
        </button>
        <button className="cr-btn cr-outline cr-small" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}
