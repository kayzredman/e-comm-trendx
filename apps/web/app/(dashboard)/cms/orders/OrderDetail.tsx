'use client'

import { useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { ordersApi, type Order, type OrderStatus } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import {
  ArrowLeft, Loader2, Clock, CheckCircle2, Package, Truck, Home,
  XCircle, User, MapPin, CreditCard, Phone, Mail, Printer, ExternalLink, StickyNote,
} from 'lucide-react'
import Link from 'next/link'
import DeliveryControl from './DeliveryControl'

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string; ring: string }> = {
  PENDING:          { label: 'Pending',          bg: '#FEF9C3', color: '#CA8A04', ring: '#FDE68A' },
  CONFIRMED:        { label: 'Confirmed',        bg: '#DBEAFE', color: '#2563EB', ring: '#BFDBFE' },
  PROCESSING:       { label: 'Processing',       bg: '#EDE9FE', color: '#7C3AED', ring: '#DDD6FE' },
  READY_FOR_PICKUP: { label: 'Ready for pickup', bg: '#FEF3C7', color: '#B45309', ring: '#FDE68A' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', bg: '#FFEDD5', color: '#EA580C', ring: '#FED7AA' },
  DELIVERED:        { label: 'Delivered',        bg: '#DCFCE7', color: '#16A34A', ring: '#BBF7D0' },
  CANCELLED:        { label: 'Cancelled',        bg: '#FEE2E2', color: '#DC2626', ring: '#FECACA' },
}

const TIMELINE_STEPS: Array<{ key: OrderStatus; label: string; icon: React.ElementType }> = [
  { key: 'PENDING',          label: 'Placed',         icon: Clock },
  { key: 'CONFIRMED',        label: 'Confirmed',      icon: CheckCircle2 },
  { key: 'PROCESSING',       label: 'Processing',     icon: Package },
  { key: 'READY_FOR_PICKUP', label: 'Ready for pickup', icon: Package },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: Truck },
  { key: 'DELIVERED',        label: 'Delivered',      icon: Home },
]

const PAYMENT_LABEL: Record<string, string> = {
  CASH_ON_DELIVERY: 'Cash on delivery',
  MOBILE_MONEY: 'Mobile money',
  CARD: 'Card',
}

function getStepIndex(status: OrderStatus): number {
  if (status === 'CANCELLED') return -1
  return TIMELINE_STEPS.findIndex((s) => s.key === status)
}

export default function OrderDetail({ order: initial }: { order: Order }) {
  const { getToken } = useAuth()
  const [order, setOrder] = useState<Order>(initial)
  const [loading, setLoading] = useState<OrderStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentIdx = getStepIndex(order.status as OrderStatus)
  const isCancelled = order.status === 'CANCELLED'

  // All available statuses — staff can move the order to any of them
  const ALL_STATUSES: OrderStatus[] = useMemo(
    () => ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
    [],
  )

  async function handleStatusChange(status: OrderStatus) {
    if (status === order.status) return
    setLoading(status)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const updated = await ordersApi.updateStatus(order.id, status, token)
      setOrder((prev) => ({ ...prev, ...updated }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed'
      setError(msg)
    } finally {
      setLoading(null)
    }
  }

  const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.PENDING
  const progressPct = isCancelled
    ? 0
    : currentIdx <= 0
      ? 0
      : (currentIdx / (TIMELINE_STEPS.length - 1)) * 100

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* ── Top bar: back + actions ─────────────────────────── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <Link
          href="/cms/orders"
          className="inline-flex items-center gap-2 text-sm font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft size={16} /> All orders
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', background: 'var(--color-surface)' }}
          >
            <Printer size={13} /> Print
          </button>
        </div>
      </div>

      {/* ── Hero card: order id + status + progress timeline ───── */}
      <div
        className="rounded-2xl border p-5 md:p-6 mb-5"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: '0 1px 3px rgba(0,0,0,.04)',
        }}
      >
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-subtle)' }}>
              Order
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--color-text)' }}>
              #{order.id.slice(-8).toUpperCase()}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {new Date(order.createdAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}
            </p>
          </div>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border"
            style={{ background: s.bg, color: s.color, borderColor: s.ring }}
          >
            {isCancelled && <XCircle size={14} />}
            {s.label}
          </span>
        </div>

        {/* Horizontal stepper */}
        {isCancelled ? (
          <div
            className="rounded-xl border px-4 py-4 flex items-center gap-3"
            style={{ background: '#FEF2F2', borderColor: '#FECACA' }}
          >
            <XCircle size={20} style={{ color: '#DC2626' }} />
            <p className="text-sm font-medium" style={{ color: '#991B1B' }}>
              This order was cancelled. No further actions can be taken.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Track */}
            <div
              className="absolute left-0 right-0 top-5 h-0.5 rounded-full"
              style={{ background: 'var(--color-border)' }}
            />
            {/* Progress fill */}
            <div
              className="absolute left-0 top-5 h-0.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: 'var(--color-primary)' }}
            />
            {/* Steps */}
            <div className="relative flex justify-between">
              {TIMELINE_STEPS.map((step, i) => {
                const reached = i <= currentIdx
                const active = i === currentIdx
                const Icon = step.icon
                return (
                  <div key={step.key} className="flex flex-col items-center gap-1.5" style={{ width: '20%' }}>
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: reached ? 'var(--color-primary)' : 'var(--color-surface)',
                        border: `2px solid ${reached ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        color: reached ? '#fff' : 'var(--color-text-subtle)',
                        boxShadow: active ? '0 0 0 4px rgba(37,99,235,.15)' : 'none',
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <p
                      className="text-[11px] font-semibold text-center leading-tight"
                      style={{ color: active ? 'var(--color-primary)' : reached ? 'var(--color-text)' : 'var(--color-text-subtle)' }}
                    >
                      {step.label}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* All status pills — staff can set the order to any status */}
        <div className="mt-6 pt-5 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-subtle)' }}>
            Update status
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_STATUSES.map((st) => {
              const ss = STATUS_STYLE[st]
              const isCurrent = st === order.status
              const busy = loading === st
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStatusChange(st)}
                  disabled={loading !== null || isCurrent}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all disabled:cursor-not-allowed hover:scale-[1.02] disabled:hover:scale-100"
                  style={{
                    background: isCurrent ? ss.bg : 'var(--color-surface)',
                    color: ss.color,
                    borderColor: isCurrent ? ss.color : ss.ring,
                    boxShadow: isCurrent ? `0 0 0 2px ${ss.ring}` : 'none',
                    opacity: isCurrent ? 1 : 0.85,
                  }}
                >
                  {busy ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : isCurrent ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <span>→</span>
                  )}
                  {ss.label}
                  {isCurrent && <span className="ml-0.5 text-[10px] font-normal opacity-70">current</span>}
                </button>
              )
            })}
          </div>
          {error && (
            <p
              className="mt-3 px-3 py-2 rounded-lg text-xs font-medium"
              style={{ background: '#FEF2F2', color: '#991B1B' }}
            >
              {error}
            </p>
          )}
        </div>
      </div>

      {/* ── Delivery control: courier assign / track / verify ── */}
      {!isCancelled && (
        <DeliveryControl orderId={order.id} deliveryCode={order.deliveryCode ?? null} />
      )}

      {/* ── 2-col body ──────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        {/* LEFT: Items + Notes */}
        <div className="space-y-5">
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div
              className="px-5 py-4 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
                Items
              </h2>
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                {order.items?.length ?? 0} {order.items?.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--color-surface-muted)' }}>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>Product</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>Qty</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>Unit</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item) => (
                  <tr key={item.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--color-text)' }}>
                      {item.productName}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                      ×{item.quantity}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                      {formatPrice(item.unitPrice)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>
                      {formatPrice(Number(item.unitPrice) * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {order.notes && (
            <div
              className="rounded-2xl border p-5 flex gap-3"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <StickyNote size={18} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-subtle)' }}>
                  Customer note
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
                  &ldquo;{order.notes}&rdquo;
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Customer + Delivery + Payment summary */}
        <div className="space-y-5">
          {/* Customer card */}
          <div
            className="rounded-2xl border p-5"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <User size={16} style={{ color: 'var(--color-primary)' }} />
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>
                Customer
              </h2>
            </div>
            <p className="text-base font-bold mb-1" style={{ color: 'var(--color-text)' }}>
              {order.customer?.name}
            </p>
            <div className="space-y-1.5 mb-4">
              {order.customer?.phone && (
                <p className="text-sm flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                  <Phone size={12} /> {order.customer.phone}
                </p>
              )}
              {order.customer?.email && (
                <p className="text-sm flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                  <Mail size={12} /> {order.customer.email}
                </p>
              )}
            </div>
            {order.customer?.id && (
              <Link
                href={`/cms/customers/${order.customer.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: 'var(--color-primary)' }}
              >
                View customer profile <ExternalLink size={11} />
              </Link>
            )}
          </div>

          {/* Delivery card */}
          {order.customer?.address && (
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
                {order.customer.address.street}
                <br />
                {order.customer.address.city}, {order.customer.address.region}
                {order.customer.address.country ? `, ${order.customer.address.country}` : ''}
              </p>
            </div>
          )}

          {/* Payment summary */}
          <div
            className="rounded-2xl border p-5"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={16} style={{ color: 'var(--color-primary)' }} />
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>
                Payment summary
              </h2>
            </div>
            <div className="space-y-2.5 mb-4">
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-text-muted)' }}>Subtotal</span>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discountAmount && Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    Discount{order.discountReason ? ` (${order.discountReason})` : ''}
                  </span>
                  <span className="font-semibold tabular-nums" style={{ color: '#059669' }}>
                    −{formatPrice(order.discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-text-muted)' }}>Delivery</span>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>
                  {Number(order.deliveryFee) === 0 ? 'Free' : formatPrice(order.deliveryFee)}
                </span>
              </div>
            </div>
            <div
              className="flex justify-between items-baseline pt-3 border-t"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Total</span>
              <span className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--color-primary)' }}>
                {formatPrice(order.total)}
              </span>
            </div>
            <div
              className="mt-4 pt-4 border-t flex items-center justify-between text-xs"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span style={{ color: 'var(--color-text-muted)' }}>Method</span>
              <span
                className="px-2 py-0.5 rounded-md font-semibold"
                style={{ background: 'var(--color-surface-muted)', color: 'var(--color-text)' }}
              >
                {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
              </span>
            </div>
            {order.paymentStatus && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span style={{ color: 'var(--color-text-muted)' }}>Status</span>
                <span className="px-2 py-0.5 rounded-md font-semibold"
                  style={
                    order.paymentStatus === 'PAID' ? { background: '#ECFDF5', color: '#059669' }
                    : order.paymentStatus === 'FAILED' ? { background: '#FEE2E2', color: '#991B1B' }
                    : order.paymentStatus === 'REFUNDED' ? { background: '#F1F5F9', color: '#475569' }
                    : { background: '#FEF3C7', color: '#92400E' }
                  }>
                  {order.paymentStatus}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
