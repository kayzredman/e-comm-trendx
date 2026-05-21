'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { ordersApi, type Order, type OrderStatus } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:          { label: 'Pending',         bg: '#FEF9C3', color: '#CA8A04' },
  CONFIRMED:        { label: 'Confirmed',        bg: '#DBEAFE', color: '#2563EB' },
  PROCESSING:       { label: 'Processing',       bg: '#EDE9FE', color: '#7C3AED' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', bg: '#FFEDD5', color: '#EA580C' },
  DELIVERED:        { label: 'Delivered',        bg: '#DCFCE7', color: '#16A34A' },
  CANCELLED:        { label: 'Cancelled',        bg: '#F3F4F6', color: '#6B7280' },
}

const ALL_STATUSES: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED',
]

const PAYMENT_LABEL: Record<string, string> = {
  CASH_ON_DELIVERY: 'Cash on delivery',
  MOBILE_MONEY: 'Mobile money',
  CARD: 'Card',
}

export default function OrderDetail({ order: initial }: { order: Order }) {
  const { getToken } = useAuth()
  const router = useRouter()
  const [order, setOrder] = useState<Order>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStatusChange(status: OrderStatus) {
    if (status === order.status) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const updated = await ordersApi.updateStatus(order.id, status, token)
      setOrder(prev => ({ ...prev, ...updated }))
    } catch (err: any) {
      setError(err.message ?? 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.PENDING

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <Link href="/cms/orders" className="inline-flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
        <ArrowLeft size={16} /> Back to orders
      </Link>

      <div className="flex flex-wrap items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Order #{order.id.slice(-8).toUpperCase()}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {new Date(order.createdAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>
        <span className="inline-flex px-3 py-1 rounded-full text-sm font-semibold" style={{ background: s.bg, color: s.color }}>
          {s.label}
        </span>
      </div>

      {error && (
        <p className="px-4 py-3 rounded-lg text-sm mb-4" style={{ background: '#FEF2F2', color: 'var(--color-error)' }}>
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 mb-4">
        {/* Customer */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Customer</h2>
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{order.customer?.name}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{order.customer?.phone}</p>
          {order.customer?.email && (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{order.customer.email}</p>
          )}
          {order.customer?.address && (
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              {order.customer.address.street}, {order.customer.address.city}, {order.customer.address.region}
            </p>
          )}
          {order.notes && (
            <p className="text-sm mt-2 italic" style={{ color: 'var(--color-text-subtle)' }}>"{order.notes}"</p>
          )}
        </div>

        {/* Payment + Status */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Payment</h2>
          <p className="text-sm font-medium mb-4" style={{ color: 'var(--color-text)' }}>
            {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
          </p>
          <h2 className="font-semibold mb-2 text-sm uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Update status</h2>
          <div className="flex flex-wrap gap-2">
            {ALL_STATUSES.map(st => {
              const ss = STATUS_STYLE[st]
              const active = st === order.status
              return (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-opacity disabled:opacity-50"
                  style={{
                    background: active ? ss.bg : 'transparent',
                    color: active ? ss.color : 'var(--color-text-muted)',
                    borderColor: active ? ss.color : 'var(--color-border)',
                    opacity: active ? 1 : 0.7,
                  }}
                >
                  {loading && active && <Loader2 size={10} className="inline animate-spin mr-1" />}
                  {ss.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-xl border overflow-hidden mb-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Items ({order.items?.length ?? 0})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th className="text-left px-5 py-2.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>Product</th>
              <th className="text-right px-5 py-2.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>Qty</th>
              <th className="text-right px-5 py-2.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>Unit price</th>
              <th className="text-right px-5 py-2.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td className="px-5 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{item.productName}</td>
                <td className="px-5 py-3 text-right" style={{ color: 'var(--color-text-muted)' }}>{item.quantity}</td>
                <td className="px-5 py-3 text-right" style={{ color: 'var(--color-text-muted)' }}>{formatPrice(item.unitPrice)}</td>
                <td className="px-5 py-3 text-right font-semibold" style={{ color: 'var(--color-text)' }}>
                  {formatPrice(Number(item.unitPrice) * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--color-border)' }}>
              <td colSpan={3} className="px-5 py-3 text-right font-medium" style={{ color: 'var(--color-text-muted)' }}>Subtotal</td>
              <td className="px-5 py-3 text-right font-semibold" style={{ color: 'var(--color-text)' }}>{formatPrice(order.subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="px-5 py-1.5 text-right text-sm" style={{ color: 'var(--color-text-muted)' }}>Delivery fee</td>
              <td className="px-5 py-1.5 text-right text-sm" style={{ color: 'var(--color-text-muted)' }}>{formatPrice(order.deliveryFee)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="px-5 py-3 text-right font-bold" style={{ color: 'var(--color-text)' }}>Total</td>
              <td className="px-5 py-3 text-right font-bold text-base" style={{ color: 'var(--color-primary)' }}>{formatPrice(order.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
