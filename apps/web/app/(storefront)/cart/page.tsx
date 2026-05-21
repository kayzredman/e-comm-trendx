'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCartStore, selectTotal, selectItemCount } from '@/lib/cart-store'
import { formatPrice } from '@/lib/utils'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react'

export default function CartPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQty = useCartStore((s) => s.updateQty)
  const clearCart = useCartStore((s) => s.clearCart)
  const total = useCartStore(selectTotal)
  const itemCount = useCartStore(selectItemCount)

  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded-xl w-48" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
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
        <h1 className="text-2xl font-extrabold mb-2" style={{ color: 'var(--color-text)' }}>Your cart is empty</h1>
        <p className="mb-8" style={{ color: 'var(--color-text-muted)' }}>Add some products to get started.</p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          Browse Products <ArrowRight size={16} />
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text)' }}>
          Shopping Cart{' '}
          <span className="text-base font-normal" style={{ color: 'var(--color-text-muted)' }}>
            ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </span>
        </h1>
        <button
          onClick={clearCart}
          className="text-sm font-medium hover:underline"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Clear all
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items list */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 p-4 rounded-2xl border"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              {/* Thumbnail */}
              <div
                className="w-24 h-24 rounded-xl overflow-hidden shrink-0"
                style={{ background: '#F3F4F6' }}
              >
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag size={24} style={{ color: '#9CA3AF' }} />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/products/${item.slug}`}
                  className="font-semibold text-sm hover:underline line-clamp-2"
                  style={{ color: 'var(--color-text)' }}
                >
                  {item.name}
                </Link>
                <p className="text-base font-bold mt-1" style={{ color: 'var(--color-primary)' }}>
                  {formatPrice(item.price)}
                </p>

                <div className="flex items-center gap-3 mt-3">
                  {/* Qty stepper */}
                  <div
                    className="flex items-center border rounded-xl overflow-hidden"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <button
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      style={{ color: 'var(--color-text)' }}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <span
                      className="w-10 text-center text-sm font-bold"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      style={{ color: 'var(--color-text)' }}
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    style={{ color: '#DC2626' }}
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>

                  {/* Line total */}
                  <span
                    className="ml-auto text-sm font-bold"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div
            className="rounded-2xl border p-6 sticky top-24"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          >
            <h2 className="font-extrabold text-lg mb-5" style={{ color: 'var(--color-text)' }}>
              Order Summary
            </h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-text-muted)' }}>
                  Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </span>
                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                  {formatPrice(total)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-text-muted)' }}>Delivery fee</span>
                <span style={{ color: 'var(--color-text-muted)' }}>Calculated at checkout</span>
              </div>
            </div>

            <div className="border-t pt-4 mb-6" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between font-extrabold text-lg">
                <span style={{ color: 'var(--color-text)' }}>Subtotal</span>
                <span style={{ color: 'var(--color-text)' }}>{formatPrice(total)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="block w-full py-3.5 text-center font-bold text-white rounded-2xl"
              style={{ background: 'var(--color-primary)' }}
            >
              Proceed to Checkout
            </Link>
            <Link
              href="/products"
              className="block w-full py-2.5 text-center text-sm font-medium mt-3 rounded-2xl hover:bg-gray-50 transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
