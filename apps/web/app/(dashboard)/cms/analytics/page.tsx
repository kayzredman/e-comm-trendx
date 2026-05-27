import { auth } from '@clerk/nextjs/server'
import { analyticsApi, type DashboardStats } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import {
  BarChart3, TrendingUp, Users,
  CheckCircle2, AlertTriangle, Trophy, Wallet, Package, PartyPopper,
} from 'lucide-react'
import RevenueChart from '../../dashboard/RevenueChart'
import OrdersDonut from '../../dashboard/OrdersDonut'
import PeriodSelector from '@/components/cms/PeriodSelector'

export const dynamic = 'force-dynamic'

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:          { label: 'Pending',         bg: '#FEF9C3', color: '#CA8A04' },
  CONFIRMED:        { label: 'Confirmed',        bg: '#DBEAFE', color: '#2563EB' },
  PROCESSING:       { label: 'Processing',       bg: '#EDE9FE', color: '#7C3AED' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', bg: '#FFEDD5', color: '#EA580C' },
  DELIVERED:        { label: 'Delivered',        bg: '#DCFCE7', color: '#16A34A' },
  CANCELLED:        { label: 'Cancelled',        bg: '#FEE2E2', color: '#DC2626' },
}

const STATUS_ORDER = ['PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']

export default async function AnalyticsPage() {
  const { getToken } = await auth()
  const token = await getToken()

  let stats: DashboardStats | null = null
  let error: string | null = null
  try {
    if (token) stats = await analyticsApi.dashboard(token)
    else error = 'Not signed in'
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load analytics'
  }

  const totalOrders = stats?.totalOrders ?? 0
  const statusTotal = stats
    ? STATUS_ORDER.reduce((sum, k) => sum + (stats.ordersByStatus[k] ?? 0), 0)
    : 0

  return (
    <div className="p-4 md:p-6 lg:p-8 -m-4 md:-m-6 lg:-m-8" style={{ background: '#EFF6FF', minHeight: '100%' }}>
      <div className="max-w-450 mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#2563EB,#3B82F6)' }}
        >
          <BarChart3 size={18} color="#fff" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--color-text)' }}>
            Analytics
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Performance snapshot across orders, revenue and inventory.
          </p>
        </div>
        </div>
        <PeriodSelector active="30d" />
      </div>

      {error && (
        <div className="rounded-xl border p-4 mb-6" style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
          <p className="text-sm font-semibold" style={{ color: '#991B1B' }}>Couldn&apos;t load analytics</p>
          <p className="text-xs mt-1" style={{ color: '#7F1D1D' }}>{error}</p>
        </div>
      )}

      {/* KPI row — focused on rates & values */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 2xl:gap-6 mb-6">
        <KpiCard
          icon={<Wallet size={16} />}
          label="Revenue · 30 days"
          value={stats ? `GH₵ ${Number(stats.revenue30d).toFixed(2)}` : '—'}
          sub={stats ? `All time: GH₵ ${Number(stats.revenueAll).toFixed(2)}` : ''}
          tint="#2563EB"
          bg="#DBEAFE"
          index={0}
        />
        <KpiCard
          icon={<TrendingUp size={16} />}
          label="Avg order value"
          value={stats ? `GH₵ ${Number(stats.avgOrderValue).toFixed(2)}` : '—'}
          sub={stats ? `${totalOrders} orders total` : ''}
          tint="#F97316"
          bg="#FFEDD5"
          index={1}
        />
        <KpiCard
          icon={<CheckCircle2 size={16} />}
          label="Completion rate"
          value={stats ? `${stats.completionRate}%` : '—'}
          sub="Delivered ÷ all orders"
          tint="#16A34A"
          bg="#DCFCE7"
          index={2}
        />
        <KpiCard
          icon={<Users size={16} />}
          label="Customers"
          value={stats?.totalCustomers ?? '—'}
          sub={stats ? `${stats.totalProducts} active products` : ''}
          tint="#2563EB"
          bg="#DBEAFE"
          index={3}
        />
      </div>

      {/* Revenue + status donut */}
      <div className="grid gap-4 2xl:gap-6 lg:grid-cols-[2fr_1fr] mb-6">
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)' }}>
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="font-extrabold" style={{ color: 'var(--color-text)', fontSize: '15px' }}>Revenue · last 14 days</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Daily totals, non-cancelled orders</p>
            </div>
            <TrendingUp size={18} style={{ color: 'var(--color-primary)', marginTop: 2 }} />
          </div>
          <RevenueChart data={stats?.revenueByDay ?? []} height={280} showBrush />
        </div>

        <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)' }}>
          <h2 className="font-extrabold mb-4" style={{ color: 'var(--color-text)', fontSize: '15px' }}>Orders by status</h2>
          <OrdersDonut data={stats?.ordersByStatus ?? {}} />
        </div>
      </div>

      {/* Status funnel (bar) + Top products */}
      <div className="grid gap-4 2xl:gap-6 lg:grid-cols-2 mb-6">
        {/* Status funnel */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-extrabold" style={{ color: 'var(--color-text)', fontSize: '15px' }}>Status breakdown</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: 'var(--color-surface-muted)', color: 'var(--color-text-muted)' }}>
              {statusTotal} orders
            </span>
          </div>
          <div className="space-y-3">
            {STATUS_ORDER.map(key => {
              const s = STATUS_STYLE[key]
              const n = stats?.ordersByStatus[key] ?? 0
              const pct = statusTotal > 0 ? (n / statusTotal) * 100 : 0
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{s.label}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      <strong style={{ color: 'var(--color-text)' }}>{n}</strong> · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-muted)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: s.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top products */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1.5px solid var(--color-border)' }}>
            <h2 className="font-extrabold flex items-center gap-2" style={{ color: 'var(--color-text)', fontSize: '15px' }}>
              <Trophy size={15} style={{ color: '#F97316' }} /> Top products by revenue
            </h2>
            <Link href="/cms/products" className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>All →</Link>
          </div>
          {!stats?.topProducts?.length ? (
            <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>No sales data yet</p>
          ) : (() => {
            const maxRev = Math.max(...stats.topProducts.map(p => Number(p.totalRevenue) || 0), 1)
            return (
            <div>
              {stats.topProducts.map((p, i) => {
                const rev = Number(p.totalRevenue) || 0
                const pct = Math.max(4, Math.round((rev / maxRev) * 100))
                return (
                <div
                  key={p.productId}
                  className="px-5 py-3 hover:bg-blue-50/40 transition-colors"
                  style={{ borderBottom: i === stats.topProducts.length - 1 ? 'none' : '1px solid var(--color-border)' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 font-mono"
                        style={{
                          background: i === 0 ? '#FFEDD5' : 'var(--color-surface-muted)',
                          color: i === 0 ? '#9A3412' : 'var(--color-text-muted)',
                        }}
                      >
                        {i + 1}
                      </div>
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{p.productName}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-bold font-mono tabular-nums" style={{ color: 'var(--color-text)' }}>
                        GH₵ {Number(p.totalRevenue).toFixed(2)}
                      </p>
                      <p className="text-xs font-mono tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{p.unitsSold} sold</p>
                    </div>
                  </div>
                  <div className="mt-2 ml-10 h-1.5 rounded-full overflow-hidden" style={{ background: '#EFF6FF' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: i === 0
                          ? 'linear-gradient(90deg, #F97316, #FB923C)'
                          : 'linear-gradient(90deg, #2563EB, #3B82F6)',
                      }}
                    />
                  </div>
                </div>
                )
              })}
            </div>
            )
          })()}
        </div>
      </div>

      {/* Low stock */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1.5px solid var(--color-border)' }}>
          <h2 className="font-extrabold flex items-center gap-2" style={{ color: 'var(--color-text)', fontSize: '15px' }}>
            <AlertTriangle size={15} style={{ color: '#F59E0B' }} /> Low stock (≤ 5 units)
          </h2>
          <Link href="/cms/products" className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>Manage →</Link>
        </div>
        {!stats?.lowStockProducts?.length ? (
          <div className="px-5 py-8 text-sm text-center flex flex-col items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
            <PartyPopper size={20} style={{ color: '#16A34A' }} />
            All products are well stocked
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
            {stats.lowStockProducts.map(product => (
              <Link
                key={product.id}
                href={`/cms/products/${product.id}/edit`}
                className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                style={{ borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}
              >
                {product.images?.[0] ? (
                  <Image src={product.images[0]} alt="" width={40} height={40} unoptimized className="rounded-lg object-cover shrink-0" style={{ width: 40, height: 40 }} />
                ) : (
                  <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center" style={{ background: 'var(--color-surface-muted)' }}>
                    <Package size={18} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{product.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatPrice(product.price)}</p>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: (product.inventory ?? 0) === 0 ? '#FEE2E2' : '#FEF9C3',
                    color: (product.inventory ?? 0) === 0 ? '#DC2626' : '#CA8A04',
                  }}
                >
                  {(product.inventory ?? 0) === 0 ? 'Out' : `${product.inventory} left`}
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

function KpiCard({
  icon, label, value, sub, tint, bg, index = 0,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  tint: string
  bg: string
  index?: number
}) {
  return (
    <div
      className="rounded-2xl p-4 animate-fade-up"
      style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        animationDelay: `${index * 60}ms`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: bg, color: tint }}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl 2xl:text-3xl font-extrabold tracking-tight font-mono tabular-nums" style={{ color: 'var(--color-text)' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
    </div>
  )
}
