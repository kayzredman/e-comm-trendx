import { auth } from '@clerk/nextjs/server'
import { customersApi, type Customer } from '@/lib/api'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, ShoppingBag,
  CheckCircle2, Wallet, TrendingUp, MessageCircle, ExternalLink,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:          { label: 'Pending',         bg: '#FEF9C3', color: '#CA8A04' },
  CONFIRMED:        { label: 'Confirmed',        bg: '#DBEAFE', color: '#2563EB' },
  PROCESSING:       { label: 'Processing',       bg: '#EDE9FE', color: '#7C3AED' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', bg: '#FFEDD5', color: '#EA580C' },
  DELIVERED:        { label: 'Delivered',        bg: '#DCFCE7', color: '#16A34A' },
  CANCELLED:        { label: 'Cancelled',        bg: '#FEE2E2', color: '#DC2626' },
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function digitsOnly(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params
  const { getToken } = await auth()
  const token = await getToken()

  if (!token) notFound()

  let customer: Customer | null = null
  try {
    customer = await customersApi.get(id, token)
  } catch {
    /* not found or API down */
  }

  if (!customer) notFound()

  const orders = customer.orders ?? []
  const totalOrders = orders.length
  const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length
  const totalSpend = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((s, o) => s + Number(o.total), 0)
  const aov = totalOrders > 0 ? totalSpend / totalOrders : 0
  const lastOrder = orders[0]

  const isVip = totalSpend >= 1000
  const isRepeat = totalOrders >= 3
  const phoneDigits = digitsOnly(customer.phone)

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* ── Top bar ──────────────────────────────────────────── */}
      <Link
        href="/cms/customers"
        className="inline-flex items-center gap-2 text-sm font-medium mb-5"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowLeft size={16} /> All customers
      </Link>

      {/* ── Hero card ────────────────────────────────────────── */}
      <div
        className="rounded-2xl border p-5 md:p-6 mb-5"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: '0 1px 3px rgba(0,0,0,.04)',
        }}
      >
        <div className="flex items-start gap-5 flex-wrap">
          {/* Avatar */}
          <div
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-extrabold text-white shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #7C3AED 100%)',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
            }}
          >
            {getInitials(customer.name)}
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--color-text)' }}>
                {customer.name}
              </h1>
              {isVip && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide"
                  style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)', color: '#fff' }}
                >
                  VIP
                </span>
              )}
              {isRepeat && !isVip && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide"
                  style={{ background: '#EDE9FE', color: '#7C3AED' }}
                >
                  Repeat
                </span>
              )}
              {totalOrders === 0 && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide"
                  style={{ background: 'var(--color-surface-muted)', color: 'var(--color-text-subtle)' }}
                >
                  New
                </span>
              )}
            </div>
            <p className="text-sm flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
              <Calendar size={13} />
              Customer since{' '}
              {new Date(customer.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Quick contact actions */}
          <div className="flex items-center gap-2">
            {phoneDigits && (
              <a
                href={`tel:${phoneDigits}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all hover:scale-[1.03]"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                <Phone size={13} /> Call
              </a>
            )}
            {phoneDigits && (
              <a
                href={`https://wa.me/${phoneDigits.replace('+', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all hover:scale-[1.03]"
                style={{
                  background: '#F0FDF4',
                  borderColor: '#BBF7D0',
                  color: '#16A34A',
                }}
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
            )}
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all hover:scale-[1.03]"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                <Mail size={13} /> Email
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total orders', value: totalOrders, icon: ShoppingBag, bg: '#EFF6FF', color: '#2563EB' },
          { label: 'Delivered', value: deliveredCount, icon: CheckCircle2, bg: '#DCFCE7', color: '#16A34A' },
          { label: 'Total spend', value: formatPrice(totalSpend), icon: Wallet, bg: '#FEF3C7', color: '#CA8A04' },
          { label: 'Avg order', value: formatPrice(aov), icon: TrendingUp, bg: '#EDE9FE', color: '#7C3AED' },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div
            key={label}
            className="rounded-2xl border p-5 transition-all hover:-translate-y-0.5"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              boxShadow: '0 1px 3px rgba(0,0,0,.04)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: bg }}
            >
              <Icon size={18} style={{ color }} />
            </div>
            <p className="text-2xl font-extrabold tabular-nums tracking-tight" style={{ color: 'var(--color-text)' }}>
              {value}
            </p>
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--color-text-muted)' }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* ── 2-col body ───────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        {/* LEFT: Order history */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div
            className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
              Order history
            </h2>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              {totalOrders} {totalOrders === 1 ? 'order' : 'orders'}
            </span>
          </div>

          {totalOrders === 0 ? (
            <div className="p-10 text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: 'var(--color-surface-muted)' }}
              >
                <ShoppingBag size={22} style={{ color: 'var(--color-text-subtle)' }} />
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                No orders yet
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Orders placed by this customer will appear here.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--color-surface-muted)' }}>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>Order</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>Date</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>Total</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>Status</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.PENDING
                  return (
                    <tr key={order.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td className="px-5 py-3.5 font-mono text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                        #{order.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-3 py-3.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-3 py-3.5 text-right font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: s.bg, color: s.color }}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/cms/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          View <ExternalLink size={11} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* RIGHT: Contact + Address + Last order */}
        <div className="space-y-5">
          <div
            className="rounded-2xl border p-5"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Phone size={16} style={{ color: 'var(--color-primary)' }} />
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>
                Contact
              </h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-text-subtle)' }}>Phone</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{customer.phone}</p>
              </div>
              {customer.email && (
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-text-subtle)' }}>Email</p>
                  <p className="text-sm font-semibold break-all" style={{ color: 'var(--color-text)' }}>{customer.email}</p>
                </div>
              )}
            </div>
          </div>

          <div
            className="rounded-2xl border p-5"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} style={{ color: 'var(--color-primary)' }} />
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>
                Delivery address
              </h2>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
              {customer.address.street}
              <br />
              {customer.address.city}, {customer.address.region}
              {customer.address.country ? `, ${customer.address.country}` : ''}
            </p>
          </div>

          {lastOrder && (
            <div
              className="rounded-2xl border p-5"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBag size={16} style={{ color: 'var(--color-primary)' }} />
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>
                  Last order
                </h2>
              </div>
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                {new Date(lastOrder.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-lg font-extrabold tabular-nums mb-3" style={{ color: 'var(--color-text)' }}>
                {formatPrice(lastOrder.total)}
              </p>
              <Link
                href={`/cms/orders/${lastOrder.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: 'var(--color-primary)' }}
              >
                Open order <ExternalLink size={11} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
