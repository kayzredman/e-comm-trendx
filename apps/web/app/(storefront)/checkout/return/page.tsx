'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { paymentsApi, type PaymentLookup } from '@/lib/api'

type Phase = 'verifying' | 'success' | 'failed' | 'pending' | 'missing'

export default function CheckoutReturnPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutReturnInner />
    </Suspense>
  )
}

function CheckoutReturnInner() {
  const router = useRouter()
  const params = useSearchParams()
  const reference = params.get('reference') ?? params.get('trxref')

  const [phase, setPhase] = useState<Phase>('verifying')
  const [info, setInfo] = useState<Extract<PaymentLookup, { found: true }> | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!reference) {
      setPhase('missing')
      return
    }
    let cancelled = false
    let attempts = 0
    const maxAttempts = 20 // ~30s with 1.5s spacing

    async function tick() {
      attempts += 1
      if (cancelled) return
      setAttempt(attempts)
      try {
        const res = await paymentsApi.lookup(reference!)
        if (cancelled) return
        if (!res.found) {
          if (attempts >= maxAttempts) {
            setPhase('pending')
          } else {
            setTimeout(tick, 1500)
          }
          return
        }
        setInfo(res)
        if (res.status === 'SUCCEEDED') {
          setPhase('success')
          // Brief pause then ship the buyer to their order.
          setTimeout(() => router.push(`/orders/${res.orderId}`), 1200)
        } else if (res.status === 'FAILED' || res.status === 'ABANDONED') {
          setPhase('failed')
        } else if (attempts >= maxAttempts) {
          setPhase('pending')
        } else {
          // REQUIRES_AUTH / PROCESSING — webhook likely just hasn't arrived.
          setTimeout(tick, 1500)
        }
      } catch {
        if (attempts >= maxAttempts) setPhase('pending')
        else setTimeout(tick, 1500)
      }
    }
    tick()
    return () => { cancelled = true }
  }, [reference, router])

  const fallbackOrderId =
    typeof window !== 'undefined' ? sessionStorage.getItem('trendx:lastOrderId') : null
  const orderHref = info?.orderId
    ? `/orders/${info.orderId}`
    : fallbackOrderId
    ? `/orders/${fallbackOrderId}`
    : '/orders'

  return (
    <div className="max-w-md mx-auto px-4 py-24" style={{ background: 'var(--color-page)' }}>
      <div
        className="rounded-2xl border p-8 text-center"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        {phase === 'verifying' && (
          <>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#EFF6FF' }}>
              <Loader2 size={28} className="animate-spin" style={{ color: '#2563EB' }} />
            </div>
            <h1 className="text-xl font-extrabold mb-2" style={{ color: 'var(--color-text)' }}>
              Confirming your payment…
            </h1>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              We&apos;re waiting for the green light from Paystack. This usually takes a few seconds.
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Check {attempt}/20
            </p>
          </>
        )}

        {phase === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#DCFCE7' }}>
              <CheckCircle2 size={32} style={{ color: '#15803D' }} />
            </div>
            <h1 className="text-xl font-extrabold mb-2" style={{ color: 'var(--color-text)' }}>
              Payment received
            </h1>
            <p className="text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Thanks! Taking you to your order…
            </p>
            {info && (
              <p className="text-xs mb-4 font-mono" style={{ color: 'var(--color-text-muted)' }}>
                ₵{info.amount} · {info.reference}
              </p>
            )}
            <Link
              href={orderHref}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              View order
            </Link>
          </>
        )}

        {phase === 'failed' && (
          <>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#FEE2E2' }}>
              <XCircle size={32} style={{ color: '#B91C1C' }} />
            </div>
            <h1 className="text-xl font-extrabold mb-2" style={{ color: 'var(--color-text)' }}>
              Payment didn&apos;t go through
            </h1>
            <p className="text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>
              No charge was made. You can try again from your order page.
            </p>
            {info && (
              <p className="text-xs mb-6 font-mono" style={{ color: 'var(--color-text-muted)' }}>
                Ref: {info.reference}
              </p>
            )}
            {!info && <div className="mb-6" />}
            <Link
              href={orderHref}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              Back to order
            </Link>
          </>
        )}

        {phase === 'pending' && (
          <>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#FFF7ED' }}>
              <AlertCircle size={32} style={{ color: '#C2410C' }} />
            </div>
            <h1 className="text-xl font-extrabold mb-2" style={{ color: 'var(--color-text)' }}>
              Still confirming…
            </h1>
            <p className="text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Paystack is taking longer than usual. Your order is safe — refresh in a minute or check the order page.
            </p>
            {reference && (
              <p className="text-xs mb-6 font-mono" style={{ color: 'var(--color-text-muted)' }}>
                Ref: {reference}
              </p>
            )}
            {!reference && <div className="mb-6" />}
            <Link
              href={orderHref}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              View order
            </Link>
          </>
        )}

        {phase === 'missing' && (
          <>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#F3F4F6' }}>
              <AlertCircle size={32} style={{ color: '#6B7280' }} />
            </div>
            <h1 className="text-xl font-extrabold mb-2" style={{ color: 'var(--color-text)' }}>
              No payment reference
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
              We couldn&apos;t find a payment to verify on this page.
            </p>
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              My orders
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
