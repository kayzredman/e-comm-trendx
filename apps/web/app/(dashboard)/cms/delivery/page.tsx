import { auth } from '@clerk/nextjs/server'
import { deliveryApi, type DeliveryZone } from '@/lib/api'
import ZoneManager from './ZoneManager'

export const dynamic = 'force-dynamic'

export default async function DeliveryPage() {
  const { getToken } = await auth()
  const token = await getToken()

  let zones: DeliveryZone[] = []
  try {
    if (token) zones = await deliveryApi.listAll(token)
  } catch { /* API not running */ }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Delivery Zones</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {zones.length} zone{zones.length !== 1 ? 's' : ''} configured
          </p>
        </div>
      </div>
      <ZoneManager initialZones={zones} />
    </div>
  )
}
