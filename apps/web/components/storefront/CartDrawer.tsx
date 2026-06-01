'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingBag, Minus, Plus, Trash2, ArrowRight } from 'lucide-react'
import { useCartStore, selectItemCount, selectTotal } from '@/lib/cart-store'
import { formatPrice } from '@/lib/utils'
import { useEffect, useMemo } from 'react'
import { useLiveStock } from '@/lib/use-live-stock'
import StockBadge from './StockBadge'

export default function CartDrawer() {
  const open = useCartStore((s) => s.drawerOpen)
  const close = useCartStore((s) => s.closeDrawer)
  const items = useCartStore((s) => s.items)
  const updateQty = useCartStore((s) => s.updateQty)
  const removeItem = useCartStore((s) => s.removeItem)
  const count = useCartStore(selectItemCount)
  const subtotal = useCartStore(selectTotal)

  const productIds = useMemo(() => Array.from(new Set(items.map((i) => i.id))), [items])
  const stockMap = useLiveStock(productIds)

  const deliveryFree = subtotal >= 200
  const delivery = deliveryFree || subtotal === 0 ? 0 : 25
  const total = subtotal + delivery

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, close])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="cart-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
            className="fixed inset-0 z-50"
            style={{
              background: 'rgba(10,15,30,0.55)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />

          {/* Drawer */}
          <motion.aside
            key="cart-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed top-0 right-0 bottom-0 z-50 flex flex-col w-full max-w-[420px]"
            style={{ background: '#fff', boxShadow: '-24px 0 60px rgba(0,0,0,0.32)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5 border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-lg" style={{ color: 'var(--color-text)' }}>Your Cart</h2>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-md"
                  style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
                >
                  {count}
                </span>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close cart"
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-100"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                    style={{ background: 'var(--color-primary-light)' }}
                  >
                    <ShoppingBag size={32} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <p className="font-bold text-base mb-1" style={{ color: 'var(--color-text)' }}>
                    Your cart is empty
                  </p>
                  <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                    Discover trending products to add.
                  </p>
                  <Link
                    href="/products"
                    onClick={close}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#2563EB,#7C3AED)' }}
                  >
                    Start shopping <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <ul className="space-y-4">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 40 }}
                        transition={{ duration: 0.22 }}
                        className="flex gap-3"
                      >
                        <Link
                          href={`/products/${item.slug}`}
                          onClick={close}
                          className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative"
                          style={{ background: 'var(--color-surface-muted)' }}
                        >
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                          )}
                        </Link>
                        <div className="flex-1 min-w-0 flex flex-col">
                          <Link
                            href={`/products/${item.slug}`}
                            onClick={close}
                            className="font-semibold text-sm line-clamp-2 leading-snug mb-1"
                            style={{ color: 'var(--color-text)' }}
                          >
                            {item.name}
                          </Link>
                          {item.variantLabel && (
                            <p className="text-[10px] font-semibold -mt-0.5 mb-1" style={{ color: 'var(--color-text-muted)' }}>
                              {item.variantLabel}
                            </p>
                          )}
                          <StockBadge qty={stockMap.get(item.id)} size="sm" className="self-start mb-1" />
                          <div className="mt-auto flex items-center justify-between">
                            <div className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                              {formatPrice(item.price)}
                            </div>
                            <div
                              className="flex items-center rounded-lg overflow-hidden"
                              style={{ border: '1.5px solid var(--color-border)' }}
                            >
                              <button
                                type="button"
                                onClick={() => updateQty(item.id, item.quantity - 1, item.variantId)}
                                aria-label="Decrease quantity"
                                className="w-7 h-7 flex items-center justify-center transition-colors hover:bg-slate-100"
                                style={{ color: 'var(--color-text-muted)' }}
                              >
                                <Minus size={12} />
                              </button>
                              <span
                                className="w-7 text-center font-bold text-xs"
                                style={{ color: 'var(--color-text)' }}
                              >
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQty(item.id, item.quantity + 1, item.variantId)}
                                aria-label="Increase quantity"
                                className="w-7 h-7 flex items-center justify-center transition-colors hover:bg-slate-100"
                                style={{ color: 'var(--color-text-muted)' }}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id, item.variantId)}
                          aria-label="Remove item"
                          className="self-start w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-rose-50"
                          style={{ color: 'var(--color-text-subtle)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* Footer / summary */}
            {items.length > 0 && (
              <div
                className="border-t px-6 py-5 space-y-2.5"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}
              >
                <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Subtotal</span>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Delivery</span>
                  <span style={{ color: deliveryFree ? 'var(--color-success)' : 'var(--color-text)', fontWeight: 600 }}>
                    {deliveryFree ? 'FREE 🎉' : formatPrice(delivery)}
                  </span>
                </div>
                <div
                  className="flex justify-between items-center pt-3 mt-1 border-t"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <span className="font-extrabold text-base" style={{ color: 'var(--color-text)' }}>Total</span>
                  <span className="font-extrabold text-xl" style={{ color: 'var(--color-text)' }}>{formatPrice(total)}</span>
                </div>

                <Link
                  href="/checkout"
                  onClick={close}
                  className="mt-3 flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-bold text-white transition-transform hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background: 'linear-gradient(135deg,#2563EB,#7C3AED)',
                    boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
                  }}
                >
                  Proceed to Checkout <ArrowRight size={16} />
                </Link>
                <p className="text-center text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>
                  🔒 Secure checkout · MoMo · Visa · Mastercard
                </p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
