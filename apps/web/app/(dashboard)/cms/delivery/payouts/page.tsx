import { auth } from '@clerk/nextjs/server'
import { payoutsApi, type PayoutSummary, type Payout } from '@/lib/api'
import PayoutsClient from './PayoutsClient'

export const dynamic = 'force-dynamic'

export default async function PayoutsPage() {
  const { getToken } = await auth()
  const token = await getToken()
  let summary: PayoutSummary | null = null
  let recent: Payout[] = []
  try {
    if (token) {
      const [s, r] = await Promise.all([
        payoutsApi.summary(token),
        payoutsApi.recent(token),
      ])
      summary = s; recent = r
    }
  } catch { /* offline */ }

  return (
    <div className="p-4 md:p-8 max-w-450 mx-auto" style={{ minHeight: '100vh', background: 'var(--color-page)' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--color-text)' }}>
          Courier payouts
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Pay riders for completed deliveries — period totals roll up unpaid commissions.
        </p>
      </div>
      <PayoutsClient initialSummary={summary} initialRecent={recent} />
    </div>
  )
}
