import { auth } from '@clerk/nextjs/server'
import { analyticsApi, type DashboardStats } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'
import { Package, ShoppingCart, Users, TrendingUp, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:          { label: 'Pending',         bg: '#FEF9C3', color: '#CA8A04' },
  CONFIRMED:        { label: 'Confirmed',        bg: '#DBEAFE', color: '#2563EB' },
  PROCESSING:       { label: 'Processing',       bg: '#EDE9FE', color: '#7C3AED' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', bg: '#FFEDD5', color: '#EA580C' },
  DELIVERED:        { label: 'Delivered',        bg: '#DCFCE7', color: '#16A34A' },
  CANCELLED:        { label: 'Cancelled',        bg: '#F3F4F6', color: '#6B7280' },
}

export default async function DashboardHome() {
  const { getToken } = await auth()
  const token = await getToken()

  let stats: DashboardStats | null = null
  try {
    if (token) stats = await analyticsApi.dashboard(token)
  } catch { /* API not running */ }

  const statCards = [
    {
      label: 'Active products',
      value: stats?.totalProducts ?? '—',
      icon: Package,
      href: '/cms/products',
      color: '#2563EB',
      bg: '#DBEAFE',
    },
    {
      label: 'Total orders',
      value: stats?.totalOrders ?? '—',
      icon: ShoppingCart,
      href: '/cms/orders',
      color: '#7C3AED',
      bg: '#EDE9FE',
    },
    {
      label: 'Customers',
      value: stats?.totalCustomers ?? '—',
      icon: Users,
      href: '/cms/customers',
      color: '#16A34A',
      bg: '#DCFCE7',
    },
    {
      label: 'Revenue (30 days)',
      value: stats ? `GH₵ ${Number(stats.revenue30d).toFixed(2)}` : '—',
      icon: TrendingUp,
      href: '/cms/orders',
      color: '#EA580C',
      bg: '#FFEDD5',
    },
  ]

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Welcome back — here's what's happening today
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, href, color, bg }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: bg }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* All-time revenue */}
      {stats && (
        <div
          className="rounded-xl border p-5 mb-6 flex items-center gap-4"
          style={{ background: 'var(--color-primary-light)', borderColor: '#BFDBFE' }}
        >
          <TrendingUp size={24} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>All-time revenue</p>
            <p className="text-3xl font-bold mt-0.5" style={{ color: 'var(--color-primary)' }}>
              GH₵ {Number(stats.revenueAll).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent orders */}
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Recent orders</h2>
            <Link href="/cms/orders" className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>View all →</Link>
          </div>
          {!stats?.recentOrders?.length ? (
            <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>No orders yet</p>
          ) : (
            <div>
              {stats.recentOrders.map(order => {
                const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.PENDING
                return (
                  <Link
                    key={order.id}
                    href={`/cms/orders/${order.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors border-b last:border-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        #{order.id.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {order.customer?.name} · {new Date(order.createdAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{formatPrice(order.total)}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Low stock */}
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}>
            <h2 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <AlertTriangle size={15} style={{ color: 'var(--color-warning)' }} /> Low stock
            </h2>
            <Link href="/cms/products" className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>View all →</Link>
          </div>
          {!stats?.lowStockProducts?.length ? (
            <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>All products are well stocked</p>
          ) : (
            <div>
              {stats.lowStockProducts.map(product => (
                <Link
                  key={product.id}
                  href={`/cms/products/${product.id}/edit`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors border-b last:border-0"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center gap-3">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-base" style={{ background: 'var(--color-surface-muted)' }}>📦</div>
                    )}
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{product.name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatPrice(product.price)}</p>
                    </div>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: product.inventory === 0 ? '#FEE2E2' : '#FEF9C3',
                      color: product.inventory === 0 ? 'var(--color-error)' : '#CA8A04',
                    }}
                  >
                    {product.inventory === 0 ? 'Out of stock' : `${product.inventory} left`}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
