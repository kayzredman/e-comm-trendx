import { auth } from '@clerk/nextjs/server'
import { paymentVerificationsApi, type PaymentVerification } from '@/lib/api'
import VerifyPaymentsClient from './VerifyPaymentsClient'

export const dynamic = 'force-dynamic'

export default async function VerifyPaymentsPage() {
  const { getToken } = await auth()
  const token = await getToken()
  let pending: PaymentVerification[] = []
  let stats = { pending: { count: 0, amount: '0' }, verifiedToday: { count: 0, amount: '0' } }
  try {
    if (token) {
      const [a, b] = await Promise.all([
        paymentVerificationsApi.list(token),
        paymentVerificationsApi.stats(token),
      ])
      pending = a
      stats = b
    }
  } catch { /* API offline */ }

  return (
    <div className="p-4 md:p-8 max-w-450 mx-auto" style={{ minHeight: '100vh', background: 'var(--color-page)' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--color-text)' }}>
          Verify payments
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          MoMo confirmations submitted by customers. Confirm to mark the order paid.
        </p>
      </div>
      <VerifyPaymentsClient initial={pending} initialStats={stats} />
    </div>
  )
}
