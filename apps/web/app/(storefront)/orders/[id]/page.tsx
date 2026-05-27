import { storefrontApi } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Clock, Package, Truck, Home, ShoppingBag } from 'lucide-react'
import type { Metadata } from 'next'
import OrderStatusPoller from './OrderStatusPoller'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return { title: `Order ${id.slice(0, 8).toUpperCase()} — trendMarga` }
}

export const dynamic = 'force-dynamic'

type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'

const STATUS_STEPS: Array<{
  key: OrderStatus
  label: string
  icon: React.ElementType
  description: string
}> = [
  {
    key: 'PENDING',
    label: 'Order Placed',
    icon: Clock,
    description: 'We have received your order and are reviewing it.',
  },
  {
    key: 'CONFIRMED',
    label: 'Confirmed',
    icon: CheckCircle2,
    description: 'Your order has been confirmed and is being prepared.',
  },
  {
    key: 'PROCESSING',
    label: 'Processing',
    icon: Package,
    description: 'Your order is being packed and made ready for dispatch.',
  },
  {
    key: 'OUT_FOR_DELIVERY',
    label: 'Out for Delivery',
    icon: Truck,
    description: "Your order is on its way! Expect delivery soon.",
  },
  {
    key: 'DELIVERED',
    label: 'Delivered',
    icon: Home,
    description: 'Your order has been successfully delivered. Enjoy!',
  },
]

function getStepIndex(status: OrderStatus): number {
  if (status === 'CANCELLED') return -1
  return STATUS_STEPS.findIndex((s) => s.key === status)
}

export default async function OrderTrackingPage({ params }: Props) {
  const { id } = await params

  let order: Awaited<ReturnType<typeof storefrontApi.getOrder>> | null = null
  try {
    order = await storefrontApi.getOrder(id)
  } catch {}

  if (!order) notFound()

  const currentStep = getStepIndex(order.status as OrderStatus)
  const isCancelled = order.status === 'CANCELLED'
  const progressPct =
    currentStep >= 0 ? (currentStep / (STATUS_STEPS.length - 1)) * 100 : 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-10" style={{ background: 'var(--color-page)' }}>
      {/* ── Hero confirmation ── */}
      <div className="text-center mb-10">
        {!isCancelled ? (
          <>
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: '#F0FDF4' }}
            >
              <CheckCircle2 size={32} style={{ color: '#16A34A' }} />
            </div>
            <h1 className="text-2xl font-extrabold mb-1" style={{ color: 'var(--color-text)' }}>
              Order Confirmed!
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Order #{order.id.slice(0, 8).toUpperCase()} · Placed on{' '}
              {new Date(order.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </>
        ) : (
          <>
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: '#FEF2F2' }}
            >
              <ShoppingBag size={32} style={{ color: '#DC2626' }} />
            </div>
            <h1 className="text-2xl font-extrabold mb-1" style={{ color: '#DC2626' }}>
              Order Cancelled
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Order #{order.id.slice(0, 8).toUpperCase()}
            </p>
          </>
        )}
      </div>

      {/* ── Progress tracker ── */}
      {!isCancelled && (
        <div
          className="rounded-2xl border p-6 mb-6"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <h2 className="font-extrabold mb-8" style={{ color: 'var(--color-text)' }}>
            Tracking
          </h2>

          <div className="relative">
            {/* Track line */}
            <div
              className="absolute h-0.5"
              style={{
                top: '20px',
                left: '20px',
                right: '20px',
                background: 'var(--color-border)',
              }}
            >
              <div
                className="h-full transition-all duration-700"
                style={{
                  background: 'var(--color-primary)',
                  width: `${progressPct}%`,
                }}
              />
            </div>

            {/* Step dots */}
            <div className="relative flex justify-between">
              {STATUS_STEPS.map((step, index) => {
                const StepIcon = step.icon
                const done = index <= currentStep
                const active = index === currentStep
                return (
                  <div key={step.key} className="flex flex-col items-center gap-2 w-16">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10 relative"
                      style={{
                        background: done ? 'var(--color-primary)' : 'var(--color-surface)',
                        borderColor: done ? 'var(--color-primary)' : 'var(--color-border)',
                      }}
                    >
                      <StepIcon
                        size={16}
                        style={{ color: done ? 'white' : 'var(--color-text-muted)' }}
                      />
                    </div>
                    <span
                      className="text-center text-xs font-semibold leading-tight"
                      style={{
                        color: active
                          ? 'var(--color-primary)'
                          : done
                          ? 'var(--color-text)'
                          : 'var(--color-text-subtle)',
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Current status message */}
          {currentStep >= 0 && (
            <div
              className="mt-8 p-4 rounded-xl"
              style={{ background: 'var(--color-primary-light)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                {STATUS_STEPS[currentStep].description}
              </p>
            </div>
          )}

          <OrderStatusPoller status={order.status} />
        </div>
      )}

      {/* ── Order details grid ── */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {/* Items */}
        <div
          className="rounded-2xl border p-5"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <h3 className="font-extrabold text-sm mb-4" style={{ color: 'var(--color-text)' }}>
            Items Ordered
          </h3>
          <div className="space-y-3">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between items-start gap-2">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {item.productName}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Qty: {item.quantity} × {formatPrice(item.unitPrice)}
                  </p>
                </div>
                <span
                  className="text-sm font-bold shrink-0"
                  style={{ color: 'var(--color-text)' }}
                >
                  {formatPrice(Number(item.unitPrice) * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment summary */}
        <div
          className="rounded-2xl border p-5"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <h3 className="font-extrabold text-sm mb-4" style={{ color: 'var(--color-text)' }}>
            Payment Summary
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-muted)' }}>Subtotal</span>
              <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                {formatPrice(order.subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-muted)' }}>Delivery fee</span>
              <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                {Number(order.deliveryFee) === 0 ? 'Free' : formatPrice(order.deliveryFee)}
              </span>
            </div>
            <div
              className="flex justify-between border-t pt-2 mt-2 font-bold text-base"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span style={{ color: 'var(--color-text)' }}>Total</span>
              <span style={{ color: 'var(--color-text)' }}>{formatPrice(order.total)}</span>
            </div>
          </div>
          <div
            className="mt-4 pt-4 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Payment:{' '}
              {order.paymentMethod === 'CASH_ON_DELIVERY'
                ? '💵 Cash on Delivery'
                : order.paymentMethod === 'MOBILE_MONEY'
                ? '📱 Mobile Money'
                : '💳 Card'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Delivery details ── */}
      {order.customer && (
        <div
          className="rounded-2xl border p-5 mb-8"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <h3 className="font-extrabold text-sm mb-3" style={{ color: 'var(--color-text)' }}>
            Delivery Details
          </h3>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {order.customer.name}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {order.customer.phone}
          </p>
          {order.customer.address && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {[
                order.customer.address.street,
                order.customer.address.city,
                order.customer.address.region,
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
          {order.notes && (
            <p className="text-sm mt-2 italic" style={{ color: 'var(--color-text-muted)' }}>
              Note: {order.notes}
            </p>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/products"
          className="flex-1 py-3.5 text-center font-bold rounded-2xl border-2 transition-colors hover:bg-gray-50"
          style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
        >
          Continue Shopping
        </Link>
        <Link
          href="/"
          className="flex-1 py-3.5 text-center font-bold rounded-2xl text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
