import { auth, currentUser } from '@clerk/nextjs/server'
import { analyticsApi, type DashboardStats } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { Package, ShoppingCart, Users, TrendingUp, AlertTriangle, CheckCircle, BarChart2 } from 'lucide-react'
import RevenueChart from './RevenueChart'
import OrdersDonut from './OrdersDonut'
import AnimatedStatCard from '@/components/cms/AnimatedStatCard'

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
  const user = await currentUser()
  const firstName = user?.firstName ?? 'there'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

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
      gradient: 'linear-gradient(135deg,#2563EB,#3B82F6)',
    },
    {
      label: 'Total orders',
      value: stats?.totalOrders ?? '—',
      icon: ShoppingCart,
      href: '/cms/orders',
      gradient: 'linear-gradient(135deg,#7C3AED,#A78BFA)',
    },
    {
      label: 'Customers',
      value: stats?.totalCustomers ?? '—',
      icon: Users,
      href: '/cms/customers',
      gradient: 'linear-gradient(135deg,#059669,#34D399)',
    },
    {
      label: 'Revenue (30 days)',
      value: stats ? `GH₵ ${Number(stats.revenue30d).toFixed(2)}` : '—',
      icon: TrendingUp,
      href: '/cms/orders',
      gradient: 'linear-gradient(135deg,#EA580C,#FB923C)',
    },
    {
      label: 'Avg order value',
      value: stats ? `GH₵ ${Number(stats.avgOrderValue).toFixed(2)}` : '—',
      icon: BarChart2,
      href: '/cms/orders',
      gradient: 'linear-gradient(135deg,#0891B2,#22D3EE)',
    },
    {
      label: 'Completion rate',
      value: stats ? `${stats.completionRate}%` : '—',
      icon: CheckCircle,
      href: '/cms/orders',
      gradient: 'linear-gradient(135deg,#16A34A,#4ADE80)',
    },
  ]

  return (
    <div className="p-4 md:p-8">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: 'var(--color-text)' }}>
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Here&apos;s what&apos;s happening with your store today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 mb-6">
        {statCards.map(({ label, value, icon, href, gradient }, i) => (
          <AnimatedStatCard
            key={label}
            label={label}
            value={value}
            icon={icon}
            href={href}
            gradient={gradient}
            index={i}
          />
        ))}
      </div>

      {/* Revenue chart */}
      <div
        className="rounded-xl border p-5 mb-6"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Revenue — last 14 days</h2>
            {stats && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                All-time: <strong style={{ color: 'var(--color-text)' }}>GH₵ {Number(stats.revenueAll).toFixed(2)}</strong>
              </p>
            )}
          </div>
          <TrendingUp size={18} style={{ color: 'var(--color-primary)', marginTop: 2 }} />
        </div>
        <RevenueChart data={stats?.revenueByDay ?? []} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        {/* Orders by status */}
        <div
          className="rounded-xl border p-5"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>Orders by status</h2>
          <OrdersDonut data={stats?.ordersByStatus ?? {}} />
        </div>

        {/* Top products by revenue */}
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Top products by revenue</h2>
            <Link href="/cms/products" className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>View all →</Link>
          </div>
          {!stats?.topProducts?.length ? (
            <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>No sales data yet</p>
          ) : (
            <div>
              {stats.topProducts.map((p, i) => {
                const maxRev = Number(stats.topProducts[0].totalRevenue)
                const pct = maxRev > 0 ? (Number(p.totalRevenue) / maxRev) * 100 : 0
                return (
                  <div
                    key={p.productId}
                    className="flex items-center gap-3 px-5 py-3 border-b last:border-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <span className="text-xs font-bold w-5 shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{p.productName}</p>
                      <div className="mt-1 h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: 'var(--color-primary)' }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>GH₵ {Number(p.totalRevenue).toFixed(0)}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{p.unitsSold} sold</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

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
                      <Image src={product.images[0]} alt="" width={32} height={32} unoptimized className="rounded object-cover shrink-0" style={{ width: 32, height: 32 }} />
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
