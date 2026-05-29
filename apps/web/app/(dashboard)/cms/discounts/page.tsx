import { auth } from '@clerk/nextjs/server'
import { discountsApi, type DiscountCode } from '@/lib/api'
import DiscountsManager from './DiscountsManager'

export const dynamic = 'force-dynamic'

export default async function DiscountsPage() {
  const { getToken } = await auth()
  const token = await getToken()

  let codes: DiscountCode[] = []
  try {
    if (token) codes = await discountsApi.list(token)
  } catch { /* API not reachable */ }

  const activeCount = codes.filter(c => c.isActive).length

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Discount codes</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {codes.length} code{codes.length === 1 ? '' : 's'} · {activeCount} active
          </p>
        </div>
      </div>
      <DiscountsManager initialCodes={codes} />
    </div>
  )
}
