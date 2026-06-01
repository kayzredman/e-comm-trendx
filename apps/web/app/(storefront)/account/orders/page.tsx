import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { Package, ArrowRight } from 'lucide-react'
import { accountApi, type AccountOrder } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  PENDING: { bg: '#FEF3C7', fg: '#92400E' },
  CONFIRMED: { bg: '#DBEAFE', fg: '#1E40AF' },
  PROCESSING: { bg: '#E0E7FF', fg: '#3730A3' },
  OUT_FOR_DELIVERY: { bg: '#FFEDD5', fg: '#9A3412' },
  DELIVERED: { bg: '#DCFCE7', fg: '#166534' },
  CANCELLED: { bg: '#FEE2E2', fg: '#991B1B' },
  REFUNDED: { bg: '#F3E8FF', fg: '#6B21A8' },
}

export default async function MyOrdersPage() {
  const { getToken } = await auth()
  const token = await getToken()
  let orders: AccountOrder[] = []
  try {
    if (token) orders = await accountApi.orders(token)
  } catch { /* ignore */ }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>My Orders</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {orders.length} order{orders.length === 1 ? '' : 's'} in total.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
          <Package size={32} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>No orders yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Your future orders will show up here.</p>
          <Link href="/products" className="inline-block mt-4 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#2563EB' }}>
            Browse products
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map(order => {
            const tone = STATUS_COLORS[order.status] ?? { bg: '#F1F5F9', fg: '#0F172A' }
            return (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="block rounded-2xl p-4 transition-all hover:-translate-y-0.5"
                  style={{ background: '#fff', border: '1px solid var(--color-border)' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                        Order #{order.id.slice(-8)}
                      </p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-text)' }}>
                        {order.items.length} item{order.items.length === 1 ? '' : 's'} · {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs mt-1 truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {order.items.slice(0, 3).map(i => i.productName).join(' · ')}
                        {order.items.length > 3 ? ` · +${order.items.length - 3} more` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                        style={{ background: tone.bg, color: tone.fg }}
                      >
                        {order.status.replace(/_/g, ' ').toLowerCase()}
                      </span>
                      <span className="text-base font-bold font-mono tabular-nums" style={{ color: 'var(--color-text)' }}>
                        {formatPrice(Number(order.total))}
                      </span>
                      <ArrowRight size={16} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
