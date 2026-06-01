'use client'

import { useState } from 'react'
import { AlertCircle, Loader2, Smartphone, CreditCard } from 'lucide-react'
import { paymentsApi } from '@/lib/api'
import { formatMoney } from '@/lib/utils'

type Props = {
  orderId: string
  paymentMethod: 'MOBILE_MONEY' | 'CARD' | 'CASH_ON_DELIVERY' | 'CASH'
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | undefined
  total: string
}

export default function PaymentRetryBanner({ orderId, paymentMethod, paymentStatus, total }: Props) {
  const [busy, setBusy] = useState<'MOBILE_MONEY' | 'CARD' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const needsRetry =
    (paymentMethod === 'MOBILE_MONEY' || paymentMethod === 'CARD') &&
    paymentStatus !== 'PAID' &&
    paymentStatus !== 'REFUNDED'
  if (!needsRetry) return null

  const isFailed = paymentStatus === 'FAILED'

  async function pay(channel: 'MOBILE_MONEY' | 'CARD') {
    setBusy(channel)
    setError(null)
    try {
      const intent = await paymentsApi.init(orderId, channel)
      if (intent.authorizationUrl) {
        window.location.href = intent.authorizationUrl
      } else {
        setError('Payment provider did not return a checkout URL. Please try again in a moment.')
        setBusy(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start payment. Please try again.')
      setBusy(null)
    }
  }

  const accent = isFailed ? '#B91C1C' : '#C2410C'
  const bg = isFailed ? '#FEF2F2' : '#FFF7ED'
  const border = isFailed ? '#FECACA' : '#FED7AA'

  return (
    <div
      className="rounded-2xl border p-5 mb-6"
      style={{ background: bg, borderColor: border }}
    >
      <div className="flex items-start gap-3 mb-4">
        <AlertCircle size={22} style={{ color: accent }} className="shrink-0 mt-0.5" />
        <div>
          <h3 className="font-extrabold text-base mb-1" style={{ color: accent }}>
            {isFailed ? 'Payment failed — try again' : 'Payment pending'}
          </h3>
          <p className="text-sm" style={{ color: '#475569' }}>
            {isFailed
              ? `Your last payment attempt didn't go through. No charge was made. Pay ${formatMoney(total)} to confirm your order.`
              : `Complete payment of ${formatMoney(total)} to confirm your order. Cash on delivery is also available — just contact us.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => pay('MOBILE_MONEY')}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-white disabled:opacity-60"
          style={{ background: '#2563EB' }}
        >
          {busy === 'MOBILE_MONEY' ? <Loader2 size={18} className="animate-spin" /> : <Smartphone size={18} />}
          Pay with Mobile Money
        </button>
        <button
          type="button"
          onClick={() => pay('CARD')}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold disabled:opacity-60"
          style={{ background: 'white', color: '#0F172A', border: '1px solid #CBD5E1' }}
        >
          {busy === 'CARD' ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
          Pay with Card
        </button>
      </div>

      {error && (
        <p className="text-xs mt-3" style={{ color: '#B91C1C' }}>
          {error}
        </p>
      )}
    </div>
  )
}
