import { auth } from '@clerk/nextjs/server'
import { couriersApi, type CourierWithStats } from '@/lib/api'
import CouriersManager from './CouriersManager'

export const dynamic = 'force-dynamic'

export default async function CouriersPage() {
  const { getToken } = await auth()
  const token = await getToken()
  let couriers: CourierWithStats[] = []
  try {
    if (token) couriers = await couriersApi.listWithStats(token)
  } catch { /* API offline */ }

  return (
    <div className="p-4 md:p-8 max-w-450 mx-auto" style={{ minHeight: '100vh', background: 'var(--color-page)' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--color-text)' }}>
          Couriers
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Manage your delivery team — fleet and freelance riders.
        </p>
      </div>
      <CouriersManager initial={couriers} />
    </div>
  )
}
