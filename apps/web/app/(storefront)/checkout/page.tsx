'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCartStore, selectTotal } from '@/lib/cart-store'
import { storefrontApi, type DeliveryZone } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import {
  ShoppingBag,
  MapPin,
  User,
  Phone,
  ChevronRight,
  Loader2,
  ArrowLeft,
} from 'lucide-react'

const GH_REGIONS = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Eastern',
  'Central',
  'Northern',
  'Volta',
  'Upper East',
  'Upper West',
  'Brong-Ahafo',
  'Oti',
  'Savannah',
  'North East',
  'Western North',
  'Ahafo',
  'Bono East',
]

type PaymentMethod = 'CASH_ON_DELIVERY' | 'MOBILE_MONEY'

export default function CheckoutPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)
  const subtotal = useCartStore(selectTotal)

  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [selectedZoneId, setSelectedZoneId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    region: '',
    notes: '',
    paymentMethod: 'CASH_ON_DELIVERY' as PaymentMethod,
  })

  useEffect(() => {
    setMounted(true)
    storefrontApi
      .getDeliveryZones()
      .then((z) => {
        const active = z.filter((zone) => zone.isActive)
        setZones(active)
        if (active.length > 0) setSelectedZoneId(active[0].id)
      })
      .catch(() => {})
  }, [])

  const selectedZone = zones.find((z) => z.id === selectedZoneId)
  const deliveryFee = selectedZone ? Number(selectedZone.baseFee) : 0
  const total = subtotal + deliveryFee

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.name.trim() || !form.phone.trim() || !form.street.trim() || !form.city.trim() || !form.region) {
      setError('Please fill in all required fields.')
      return
    }
    if (items.length === 0) {
      setError('Your cart is empty.')
      return
    }
    if (!selectedZoneId) {
      setError('Please select a delivery zone.')
      return
    }

    setLoading(true)
    try {
      const order = await storefrontApi.placeOrder({
        customer: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          address: {
            street: form.street.trim(),
            city: form.city.trim(),
            region: form.region,
            country: 'Ghana',
          },
        },
        items: items.map((i) => ({
          productId: i.id,
          productName: i.name,
          unitPrice: i.price,
          quantity: i.quantity,
        })),
        zoneId: selectedZoneId,
        notes: form.notes.trim() || undefined,
        paymentMethod: form.paymentMethod,
        subtotal,
        deliveryFee,
        total,
      })
      clearCart()
      router.push(`/orders/${order.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to place order. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded-xl w-40" />
          <div className="h-64 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: '#F3F4F6' }}>
          <ShoppingBag size={40} style={{ color: '#9CA3AF' }} />
        </div>
        <h1 className="text-2xl font-extrabold mb-2" style={{ color: 'var(--color-text)' }}>Nothing to checkout</h1>
        <p className="mb-8" style={{ color: 'var(--color-text-muted)' }}>Your cart is empty.</p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          Browse Products
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8" style={{ background: 'var(--color-page)' }}>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/cart"
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          style={{ color: 'var(--color-text)' }}
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text)' }}>Checkout</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Left column: form ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Customer details */}
            <section
              className="rounded-2xl border p-6"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <h2
                className="font-extrabold mb-5 flex items-center gap-2"
                style={{ color: 'var(--color-text)' }}
              >
                <User size={18} style={{ color: 'var(--color-primary)' }} />
                Your Details
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Full Name *
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Kwame Mensah"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2"
                    style={{ borderColor: 'var(--color-border)', background: '#F8F9FA', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Phone Number *
                  </label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    placeholder="e.g. 0244 123 456"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                    style={{ borderColor: 'var(--color-border)', background: '#F8F9FA', color: 'var(--color-text)' }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Email (optional)
                  </label>
                  <input
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    type="email"
                    placeholder="you@email.com"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                    style={{ borderColor: 'var(--color-border)', background: '#F8F9FA', color: 'var(--color-text)' }}
                  />
                </div>
              </div>
            </section>

            {/* Delivery address */}
            <section
              className="rounded-2xl border p-6"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <h2
                className="font-extrabold mb-5 flex items-center gap-2"
                style={{ color: 'var(--color-text)' }}
              >
                <MapPin size={18} style={{ color: 'var(--color-primary)' }} />
                Delivery Address
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Street Address *
                  </label>
                  <input
                    name="street"
                    value={form.street}
                    onChange={handleChange}
                    required
                    placeholder="House no., street, area"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                    style={{ borderColor: 'var(--color-border)', background: '#F8F9FA', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    City *
                  </label>
                  <input
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Accra"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                    style={{ borderColor: 'var(--color-border)', background: '#F8F9FA', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Region *
                  </label>
                  <select
                    name="region"
                    value={form.region}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                    style={{
                      borderColor: 'var(--color-border)',
                      background: '#F8F9FA',
                      color: form.region ? 'var(--color-text)' : 'var(--color-text-muted)',
                    }}
                  >
                    <option value="">Select region</option>
                    {GH_REGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Delivery zone */}
            <section
              className="rounded-2xl border p-6"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <h2 className="font-extrabold mb-5" style={{ color: 'var(--color-text)' }}>
                Delivery Zone
              </h2>
              {zones.length === 0 ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <Loader2 size={16} className="animate-spin" /> Loading delivery zones…
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {zones.map((zone) => {
                    const active = selectedZoneId === zone.id
                    return (
                      <label
                        key={zone.id}
                        className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all"
                        style={{
                          borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
                          background: active ? 'var(--color-primary-light)' : 'transparent',
                          outline: active ? '2px solid var(--color-primary)' : 'none',
                          outlineOffset: '-2px',
                        }}
                      >
                        <input
                          type="radio"
                          name="zone"
                          value={zone.id}
                          checked={active}
                          onChange={() => setSelectedZoneId(zone.id)}
                          className="sr-only"
                        />
                        <div
                          className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                          style={{
                            borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
                            background: active ? 'var(--color-primary)' : 'transparent',
                          }}
                        >
                          {active && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                            {zone.name}
                          </p>
                          <p
                            className="text-xs font-bold mt-0.5"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            {Number(zone.baseFee) === 0 ? 'Free' : formatPrice(zone.baseFee)}
                          </p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Payment method */}
            <section
              className="rounded-2xl border p-6"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <h2 className="font-extrabold mb-5" style={{ color: 'var(--color-text)' }}>
                Payment Method
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {(
                  [
                    { value: 'CASH_ON_DELIVERY', label: '💵 Cash on Delivery' },
                    { value: 'MOBILE_MONEY', label: '📱 Mobile Money' },
                  ] as const
                ).map(({ value, label }) => {
                  const active = form.paymentMethod === value
                  return (
                    <label
                      key={value}
                      className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all"
                      style={{
                        borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
                        background: active ? 'var(--color-primary-light)' : 'transparent',
                        outline: active ? '2px solid var(--color-primary)' : 'none',
                        outlineOffset: '-2px',
                      }}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={value}
                        checked={active}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{
                          borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
                          background: active ? 'var(--color-primary)' : 'transparent',
                        }}
                      >
                        {active && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        {label}
                      </span>
                    </label>
                  )
                })}
              </div>
            </section>

            {/* Notes */}
            <section
              className="rounded-2xl border p-6"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <h2 className="font-extrabold mb-5" style={{ color: 'var(--color-text)' }}>
                Order Notes{' '}
                <span className="text-sm font-normal" style={{ color: 'var(--color-text-muted)' }}>
                  (optional)
                </span>
              </h2>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Any special instructions for delivery…"
                rows={3}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none resize-none"
                style={{
                  borderColor: 'var(--color-border)',
                  background: '#F8F9FA',
                  color: 'var(--color-text)',
                }}
              />
            </section>
          </div>

          {/* ── Right column: order summary ── */}
          <div className="lg:col-span-1">
            <div
              className="rounded-2xl border p-6 sticky top-24"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <h2 className="font-extrabold text-lg mb-5" style={{ color: 'var(--color-text)' }}>
                Order Summary
              </h2>

              {/* Item list */}
              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg overflow-hidden shrink-0"
                      style={{ background: '#F3F4F6' }}
                    >
                      {item.image && (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-1" style={{ color: 'var(--color-text)' }}>
                        {item.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="text-xs font-bold shrink-0" style={{ color: 'var(--color-text)' }}>
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pricing breakdown */}
              <div
                className="border-t pt-4 space-y-2 mb-4"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-text-muted)' }}>Subtotal</span>
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-text-muted)' }}>Delivery</span>
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    {selectedZone
                      ? deliveryFee === 0
                        ? 'Free'
                        : formatPrice(deliveryFee)
                      : '—'}
                  </span>
                </div>
              </div>

              <div
                className="border-t pt-4 mb-6"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex justify-between font-extrabold text-xl">
                  <span style={{ color: 'var(--color-text)' }}>Total</span>
                  <span style={{ color: 'var(--color-text)' }}>{formatPrice(total)}</span>
                </div>
              </div>

              {error && (
                <div
                  className="mb-4 p-3 rounded-xl text-sm font-medium"
                  style={{ background: '#FEF2F2', color: '#DC2626' }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl font-bold text-white disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
                style={{ background: 'var(--color-primary)' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Placing order…
                  </>
                ) : (
                  <>
                    Place Order <ChevronRight size={18} />
                  </>
                )}
              </button>

              <p className="text-xs text-center mt-3" style={{ color: 'var(--color-text-subtle)' }}>
                By placing your order you agree to our{' '}
                <Link href="/delivery" className="underline">Terms of Service</Link>.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
