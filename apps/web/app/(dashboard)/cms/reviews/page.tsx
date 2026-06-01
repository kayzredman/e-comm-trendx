import { auth } from '@clerk/nextjs/server'
import { reviewsAdminApi, type ReviewRow } from '@/lib/api'
import ReviewsModerationClient from './ReviewsModerationClient'

export const dynamic = 'force-dynamic'

export default async function CmsReviewsPage() {
  const { getToken } = await auth()
  const token = await getToken()

  let reviews: ReviewRow[] = []
  try {
    if (token) reviews = await reviewsAdminApi.list(token)
  } catch {
    /* API not reachable — render empty list */
  }

  const pending = reviews.filter((r) => r.status === 'PENDING').length
  const published = reviews.filter((r) => r.status === 'PUBLISHED').length

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-450" style={{ background: '#EFF6FF', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Reviews</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            <span className="font-mono tabular-nums font-semibold">{reviews.length}</span> total
            {' · '}
            <span className="font-mono tabular-nums font-semibold">{pending}</span> pending
            {' · '}
            <span className="font-mono tabular-nums font-semibold">{published}</span> live
          </p>
        </div>
      </div>
      <ReviewsModerationClient initialReviews={reviews} />
    </div>
  )
}
