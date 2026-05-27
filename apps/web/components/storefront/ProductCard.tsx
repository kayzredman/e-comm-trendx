'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ShoppingCart, Eye } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/lib/api'
import AddToCartButton from './AddToCartButton'
import { publicFeatures } from '@trendmarga/config'

export default function ProductCard({ product }: { product: Product }) {
  const [wishlisted, setWishlisted] = useState(false)
  const [hovered, setHovered] = useState(false)

  const hasDiscount = product.comparePrice && Number(product.comparePrice) > Number(product.price)
  const discountPct = hasDiscount
    ? Math.round(((Number(product.comparePrice) - Number(product.price)) / Number(product.comparePrice)) * 100)
    : 0

  const isNew = false // could derive from createdAt in future

  // Stock UI gated by FEATURE_INVENTORY
  const stockEnabled = publicFeatures.inventory
  const inv = product.inventory ?? 0
  const outOfStock = stockEnabled && inv <= 0
  const lowStock = stockEnabled && inv > 0 && inv <= 5

  return (
    <motion.div
      className="group rounded-2xl overflow-hidden flex flex-col"
      style={{ background: 'var(--color-surface)' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, boxShadow: '0 20px 48px rgba(0,0,0,0.13), 0 4px 16px rgba(0,0,0,0.07)' }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      {/* Image area */}
      <div className="relative overflow-hidden" style={{ background: 'var(--color-surface-muted)', aspectRatio: '1' }}>
        <Link href={`/products/${product.slug}`}>
          {product.images?.[0] ? (
            <motion.img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
              animate={{ scale: hovered ? 1.07 : 1 }}
              transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
          )}
        </Link>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          {hasDiscount && (
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
              style={{ background: 'linear-gradient(135deg, #EF4444, #EC4899)' }}
            >
              -{discountPct}%
            </span>
          )}
          {isNew && (
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
              style={{ background: 'linear-gradient(135deg, #10B981, #06B6D4)' }}
            >
              New
            </span>
          )}
          {outOfStock && (
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white"
              style={{ background: '#6B7280' }}
            >
              Out of stock
            </span>
          )}
          {lowStock && (
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white"
              style={{ background: '#F59E0B' }}
            >
              Only {inv} left
            </span>
          )}
        </div>

        {/* Wishlist heart */}
        <motion.button
          className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            color: wishlisted ? '#EF4444' : '#9CA3AF',
            boxShadow: '0 2px 8px rgba(0,0,0,.12)',
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.8 }}
          whileTap={{ scale: 1.3 }}
          transition={{ duration: 0.18 }}
          onClick={() => setWishlisted(w => !w)}
          aria-label="Add to wishlist"
        >
          <Heart size={14} fill={wishlisted ? 'currentColor' : 'none'} />
        </motion.button>

        {/* Quick-view overlay */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 flex gap-2 p-3"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            >
              <Link
                href={`/products/${product.slug}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(8px)' }}
              >
                <Eye size={13} /> Quick View
              </Link>
              <AddToCartButton
                product={product}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)' }}
                label={<><ShoppingCart size={13} /> Add</>}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        {product.category && (
          <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-primary)' }}>
            {product.category.name}
          </p>
        )}
        <Link
          href={`/products/${product.slug}`}
          className="font-semibold text-sm leading-snug line-clamp-2 flex-1 mb-2 transition-colors hover:opacity-70"
          style={{ color: 'var(--color-text)' }}
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-1.5 mb-3">
          <span className="font-bold text-base" style={{ color: 'var(--color-text)' }}>
            {formatPrice(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-xs line-through" style={{ color: 'var(--color-text-subtle)' }}>
              {formatPrice(product.comparePrice!)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
