import { auth, currentUser } from '@clerk/nextjs/server'
import { analyticsApi, type DashboardStats } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { TrendingUp, AlertTriangle, Package } from 'lucide-react'
import PeriodSelector from '@/components/cms/PeriodSelector'
import RevenueChart from './RevenueChart'
import OrdersDonut from './OrdersDonut'
import AnimatedStatCard, { type StatAccent, type StatIcon } from '@/components/cms/AnimatedStatCard'
import DeliveryPipeline from '@/components/cms/DeliveryPipeline'
import ActiveDeliveries from '@/components/cms/ActiveDeliveries'

export const dynamic = 'force-dynamic'

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

  const statCards: Array<{ label: string; value: string | number; icon: StatIcon; href: string; accent: StatAccent }> = [
    {
      label: 'Revenue (30 days)',
      value: stats ? `GH₵ ${Number(stats.revenue30d).toFixed(2)}` : '—',
      icon: 'revenue',
      href: '/cms/orders',
      accent: 'blue',
    },
    {
      label: 'Total orders',
      value: stats?.totalOrders ?? '—',
      icon: 'orders',
      href: '/cms/orders',
      accent: 'green',
    },
    {
      label: 'Customers',
      value: stats?.totalCustomers ?? '—',
      icon: 'customers',
      href: '/cms/customers',
      accent: 'purple',
    },
    {
      label: 'Active products',
      value: stats?.totalProducts ?? '—',
      icon: 'products',
      href: '/cms/products',
      accent: 'amber',
    },
  ]

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8" style={{ background: '#EFF6FF', minHeight: '100vh' }}>
      {/* Greeting + period selector */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
        <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: 'var(--color-text)' }}>
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Here&apos;s what&apos;s happening with your store today.
          </p>
        </div>
        <PeriodSelector active="30d" />
      </div>

      {/* Stat cards (V2 hero row — 4 across) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, icon, href, accent }, i) => (
          <AnimatedStatCard
            key={label}
            label={label}
            value={value}
            icon={icon}
            href={href}
            accent={accent}
            index={i}
          />
        ))}
      </div>

      {/* Chart row: revenue (2fr) + donut (1fr) */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr] mb-6">
        <div
          className="rounded-2xl p-5"
          style={{ background: '#FFFFFF', border: '1.5px solid rgba(226,232,240,0.8)' }}
        >
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="font-extrabold" style={{ color: '#0F172A', fontSize: '15px' }}>Revenue — last 14 days</h2>
              {stats && (
                <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
                  All-time: <strong style={{ color: '#1E293B' }}>GH₵ {Number(stats.revenueAll).toFixed(2)}</strong>
                </p>
              )}
            </div>
            <TrendingUp size={18} style={{ color: 'var(--color-primary)', marginTop: 2 }} />
          </div>
          <RevenueChart data={stats?.revenueByDay ?? []} />
        </div>
        <div
          className="rounded-2xl p-5"
          style={{ background: '#FFFFFF', border: '1.5px solid rgba(226,232,240,0.8)' }}
        >
          <h2 className="font-extrabold mb-4" style={{ color: '#0F172A', fontSize: '15px' }}>Orders by status</h2>
          <OrdersDonut data={stats?.ordersByStatus ?? {}} />
        </div>
      </div>

      {/* Delivery pipeline strip (full-width) */}
      <DeliveryPipeline
        data={stats?.deliveryPipeline ?? { confirmed: 0, processing: 0, outForDelivery: 0, deliveredToday: 0 }}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Active deliveries (replaces Recent orders) */}
        <ActiveDeliveries deliveries={stats?.activeDeliveries ?? []} />

        {/* Low stock */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1.5px solid rgba(226,232,240,0.8)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1.5px solid #F1F5F9' }}>
            <h2 className="font-extrabold flex items-center gap-2" style={{ color: '#0F172A', fontSize: '15px' }}>
              <AlertTriangle size={15} style={{ color: 'var(--color-warning)' }} /> Low stock
            </h2>
            <Link href="/cms/products" className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>View all →</Link>
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
                      <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center" style={{ background: 'var(--color-surface-muted)' }}>
                        <Package size={14} style={{ color: 'var(--color-text-muted)' }} />
                      </div>
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
