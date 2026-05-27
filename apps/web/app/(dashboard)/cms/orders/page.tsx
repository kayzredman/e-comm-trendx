import { auth } from '@clerk/nextjs/server'
import { ordersApi, type Order } from '@/lib/api'
import OrdersTable from './OrdersTable'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const { getToken } = await auth()
  const token = await getToken()

  let orders: Order[] = []
  try {
    if (token) orders = await ordersApi.list(token)
  } catch { /* API not running */ }

  const revenue = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + Number(o.total), 0)

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Orders</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {orders.length} order{orders.length !== 1 ? 's' : ''} · GH₵ {revenue.toFixed(2)} total revenue
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>No orders yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-subtle)' }}>Orders will appear here once customers place them</p>
        </div>
      ) : (
        <OrdersTable orders={orders} />
      )}
    </div>
  )
}
