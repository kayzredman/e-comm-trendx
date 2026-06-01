'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ShoppingBag,
  ShoppingCart,
  Heart,
  Truck,
  RotateCcw,
  ShieldCheck,
  PackageCheck,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import AddToCartButton from '@/components/storefront/AddToCartButton'
import type { Product, ProductVariant } from '@/lib/api'
import { publicFeatures } from '@trendmarga/config'
import { LOW_STOCK_THRESHOLD } from '@/lib/use-live-stock'

type Props = { product: Product }

type ColorSwatch = {
  /** Stable key — colorHex if present, else color name, else 'default'. */
  key: string
  /** Display name (first non-empty among matching variants). */
  name: string
  /** Hex for the swatch background; fallback to neutral grey. */
  hex: string
}

export default function ProductDetailsPanel({ product }: Props) {
  const variants = (product.variants ?? []).filter((v) => v.isActive)
  const hasVariants = variants.length > 0

  // ── Derive unique colours, in sortOrder ────────────────────────────────────
  const colors = useMemo<ColorSwatch[]>(() => {
    const seen = new Map<string, ColorSwatch>()
    for (const v of variants) {
      const hex = v.colorHex?.trim() || ''
      const name = v.color?.trim() || ''
      if (!hex && !name) continue
      const key = (hex || name).toLowerCase()
      if (!seen.has(key)) {
        seen.set(key, { key, name: name || hex, hex: hex || '#CBD5E1' })
      }
    }
    return Array.from(seen.values())
  }, [variants])

  // ── Derive unique sizes, in sortOrder ──────────────────────────────────────
  const sizes = useMemo<string[]>(() => {
    const seen = new Set<string>()
    for (const v of variants) {
      const s = v.size?.trim()
      if (s && !seen.has(s)) seen.add(s)
    }
    return Array.from(seen)
  }, [variants])

  const hasColors = colors.length > 0
  const hasSizes = sizes.length > 0

  // ── Selection state ────────────────────────────────────────────────────────
  const [selectedColor, setSelectedColor] = useState<string | null>(
    hasColors ? colors[0].key : null,
  )
  const [selectedSize, setSelectedSize] = useState<string | null>(
    // Pre-select size only when there's a single size axis to make 1-click ATC possible
    !hasColors && sizes.length === 1 ? sizes[0] : null,
  )

  // ── Resolve currently-selected variant ─────────────────────────────────────
  const selectedVariant = useMemo<ProductVariant | null>(() => {
    if (!hasVariants) return null
    return (
      variants.find((v) => {
        if (hasColors) {
          const key = (v.colorHex?.trim() || v.color?.trim() || '').toLowerCase()
          if (key !== selectedColor) return false
        }
        if (hasSizes) {
          if ((v.size?.trim() ?? '') !== selectedSize) return false
        }
        return true
      }) ?? null
    )
  }, [variants, hasVariants, hasColors, hasSizes, selectedColor, selectedSize])

  // ── Which sizes are out of stock for the picked colour? ───────────────────
  const sizeStock = useMemo<Map<string, number>>(() => {
    const m = new Map<string, number>()
    for (const v of variants) {
      if (hasColors) {
        const key = (v.colorHex?.trim() || v.color?.trim() || '').toLowerCase()
        if (key !== selectedColor) continue
      }
      const s = v.size?.trim() ?? ''
      m.set(s, (m.get(s) ?? 0) + v.inventory)
    }
    return m
  }, [variants, hasColors, selectedColor])

  // ── Price + stock to display ───────────────────────────────────────────────
  const displayPrice = selectedVariant?.priceOverride ?? product.price
  const compareNum = product.comparePrice ? Number(product.comparePrice) : 0
  const priceNum = Number(displayPrice)
  const hasCompare = compareNum > priceNum
  const discount = hasCompare ? Math.round((1 - priceNum / compareNum) * 100) : null

  const displayStock = hasVariants
    ? (selectedVariant?.inventory ?? 0)
    : product.inventory
  const totalVariantStock = hasVariants
    ? variants.reduce((acc, v) => acc + v.inventory, 0)
    : product.inventory

  const productOutOfStock = hasVariants ? totalVariantStock === 0 : product.inventory === 0
  const needsSelection = hasVariants && !selectedVariant
  const selectedOutOfStock = !!selectedVariant && selectedVariant.inventory === 0
  const lowStock = displayStock > 0 && displayStock <= LOW_STOCK_THRESHOLD

  const atcDisabled = productOutOfStock || needsSelection || selectedOutOfStock

  // Label used for cart line + future order snapshot
  const variantLabel = selectedVariant
    ? [selectedVariant.color, selectedVariant.size].filter(Boolean).join(' · ')
    : null

  const selectedColorName = hasColors
    ? colors.find((c) => c.key === selectedColor)?.name ?? ''
    : ''

  return (
    <div className="pt-1">
      {product.category && (
        <Link
          href={`/categories/${product.category.slug}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] mb-3"
          style={{ color: 'var(--color-primary)' }}
        >
          {product.category.name}
        </Link>
      )}

      <h1
        className="text-3xl lg:text-[32px] font-black leading-tight mb-4"
        style={{ color: 'var(--color-text)', letterSpacing: '-0.8px' }}
      >
        {product.name}
      </h1>

      {/* Price row */}
      <div
        className="flex items-baseline gap-2.5 flex-wrap pb-5 mb-5"
        style={{ borderBottom: '1.5px solid #F1F5F9' }}
      >
        <span
          className="font-black"
          style={{ color: 'var(--color-text)', fontSize: '36px', letterSpacing: '-1px' }}
        >
          {formatPrice(displayPrice)}
        </span>
        {hasCompare && product.comparePrice && (
          <span
            className="line-through font-medium"
            style={{ color: 'var(--color-text-subtle)', fontSize: '20px' }}
          >
            {formatPrice(product.comparePrice)}
          </span>
        )}
        {discount && (
          <span
            className="text-[13px] font-extrabold px-2.5 py-1 rounded-lg text-white"
            style={{ background: 'linear-gradient(135deg,#F59E0B 0%,#EF4444 100%)' }}
          >
            {discount}% OFF
          </span>
        )}
      </div>

      {product.description && (
        <p
          className="text-sm leading-relaxed mb-5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {product.description}
        </p>
      )}

      {/* ── Colour picker ────────────────────────────────────────── */}
      {hasColors && (
        <div className="mb-5">
          <div
            className="text-[13px] font-semibold mb-2"
            style={{ color: 'var(--color-text)' }}
          >
            Color: <strong>{selectedColorName || 'Pick a colour'}</strong>
          </div>
          <div className="flex gap-2 flex-wrap">
            {colors.map((c) => {
              const active = c.key === selectedColor
              const isLight = isLightHex(c.hex)
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setSelectedColor(c.key)}
                  aria-label={c.name}
                  aria-pressed={active}
                  title={c.name}
                  className="relative w-9 h-9 rounded-full transition-all"
                  style={{
                    background: c.hex,
                    border: active
                      ? '2.5px solid var(--color-primary)'
                      : isLight
                        ? '2px solid #E2E8F0'
                        : '2px solid transparent',
                    transform: active ? 'scale(1.12)' : 'scale(1)',
                    boxShadow: active ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
                  }}
                >
                  {active && (
                    <span
                      className="absolute inset-0 flex items-center justify-center text-xs font-black"
                      style={{ color: isLight ? '#0F172A' : '#fff' }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Size picker ──────────────────────────────────────────── */}
      {hasSizes && (
        <div className="mb-5">
          <div
            className="text-[13px] font-semibold mb-2"
            style={{ color: 'var(--color-text)' }}
          >
            Size: <strong>{selectedSize ?? 'Pick a size'}</strong>
          </div>
          <div className="flex gap-2 flex-wrap">
            {sizes.map((s) => {
              const stock = sizeStock.get(s) ?? 0
              const oos = stock === 0
              const active = s === selectedSize
              return (
                <button
                  key={s}
                  type="button"
                  disabled={oos}
                  onClick={() => !oos && setSelectedSize(s)}
                  aria-pressed={active}
                  className="min-w-[48px] h-12 rounded-lg text-sm font-bold transition-all px-3"
                  style={{
                    background: active ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: active
                      ? '#fff'
                      : oos
                        ? 'var(--color-text-subtle)'
                        : 'var(--color-text)',
                    border: active
                      ? '2px solid var(--color-primary)'
                      : '2px solid var(--color-border)',
                    cursor: oos ? 'not-allowed' : 'pointer',
                    opacity: oos ? 0.45 : 1,
                    textDecoration: oos ? 'line-through' : 'none',
                  }}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Stock */}
      <div className="inline-flex items-center gap-2 mb-5 text-[13px] font-semibold">
        {productOutOfStock ? (
          <>
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--color-error)' }}
            />
            <span style={{ color: 'var(--color-error)' }}>Out of Stock</span>
          </>
        ) : needsSelection ? (
          <>
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--color-warning)' }}
            />
            <span style={{ color: 'var(--color-warning)' }}>
              Select {hasColors && !selectedColor ? 'a colour' : 'a size'} to check stock
            </span>
          </>
        ) : selectedOutOfStock ? (
          <>
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--color-error)' }}
            />
            <span style={{ color: 'var(--color-error)' }}>This option is sold out</span>
          </>
        ) : (
          <>
            <span className="relative flex w-2 h-2">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: 'var(--color-success)' }}
              />
              <span
                className="relative inline-flex rounded-full w-2 h-2"
                style={{ background: 'var(--color-success)' }}
              />
            </span>
            <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>In Stock</span>
            {publicFeatures.inventory && lowStock && (
              <span style={{ color: 'var(--color-text-muted)' }}>
                — Only {displayStock} left!
              </span>
            )}
          </>
        )}
      </div>

      {(selectedVariant?.sku || product.sku) && (
        <p className="text-xs mb-5" style={{ color: 'var(--color-text-subtle)' }}>
          SKU: {selectedVariant?.sku ?? product.sku}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2.5 mb-5">
        <AddToCartButton
          product={{
            ...product,
            // Override price so the cart records the variant price, not the base.
            price: displayPrice,
          }}
          disabled={atcDisabled}
          variantId={selectedVariant?.id}
          variantLabel={variantLabel}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-[15px] font-extrabold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg,#2563EB 0%,#7C3AED 100%)',
            boxShadow: '0 8px 32px rgba(37,99,235,0.25)',
          }}
          label={
            <>
              <ShoppingCart size={18} strokeWidth={2.5} />
              {needsSelection ? 'Select an option' : 'Add to Cart'}
            </>
          }
        />
        <button
          type="button"
          aria-label="Add to wishlist"
          className="w-[52px] h-[52px] rounded-xl flex items-center justify-center transition-transform hover:scale-[1.08]"
          style={{
            background: '#FFF1F2',
            border: '1.5px solid #FECDD3',
            color: '#F43F5E',
          }}
        >
          <Heart size={22} />
        </button>
      </div>

      <Link
        href={atcDisabled ? '#' : '/checkout'}
        aria-disabled={atcDisabled}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-colors mb-6"
        style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          color: atcDisabled ? 'var(--color-text-subtle)' : 'var(--color-text)',
          pointerEvents: atcDisabled ? 'none' : 'auto',
        }}
      >
        <ShoppingBag size={16} />
        Buy Now
      </Link>

      <div
        className="flex flex-col gap-2.5 p-4 rounded-xl"
        style={{
          background: 'var(--color-surface-muted)',
          border: '1.5px solid #F1F5F9',
        }}
      >
        <TrustRow
          icon={<Truck size={16} style={{ color: 'var(--color-primary)' }} />}
          label="Free Delivery"
          detail="on orders over ₵200 — estimated 1–2 days"
        />
        <TrustRow
          icon={<RotateCcw size={16} style={{ color: 'var(--color-primary)' }} />}
          label="30-day returns"
          detail="hassle-free, no questions asked"
        />
        <TrustRow
          icon={<ShieldCheck size={16} style={{ color: 'var(--color-primary)' }} />}
          label="Secure payment"
          detail="MoMo, Visa, Mastercard accepted"
        />
        <TrustRow
          icon={<PackageCheck size={16} style={{ color: 'var(--color-primary)' }} />}
          label="Authentic product"
          detail="verified & quality-checked"
        />
      </div>
    </div>
  )
}

function TrustRow({
  icon,
  label,
  detail,
}: {
  icon: React.ReactNode
  label: string
  detail: string
}) {
  return (
    <div className="flex items-center gap-2.5 text-[13px]" style={{ color: '#475569' }}>
      <span className="shrink-0">{icon}</span>
      <span>
        <strong style={{ color: 'var(--color-text)' }}>{label}</strong> — {detail}
      </span>
    </div>
  )
}

/** Returns true for light swatches that need a visible border so they don't
 *  disappear on the page background. */
function isLightHex(hex: string): boolean {
  const h = hex.replace('#', '')
  if (h.length !== 3 && h.length !== 6) return false
  const expand = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(expand.slice(0, 2), 16)
  const g = parseInt(expand.slice(2, 4), 16)
  const b = parseInt(expand.slice(4, 6), 16)
  // perceived brightness (ITU-R BT.601)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 200
}
