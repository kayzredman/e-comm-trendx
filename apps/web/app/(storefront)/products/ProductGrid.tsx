'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { type Product, type Category } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { Search, SlidersHorizontal, X, Heart, ShoppingCart } from 'lucide-react'

function ProductCard({ product }: { product: Product }) {
  const hasDiscount = product.comparePrice && Number(product.comparePrice) > Number(product.price)
  const discountPct = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.comparePrice!)) * 100)
    : null

  return (
    <div className="group relative rounded-2xl border overflow-hidden hover:shadow-lg transition-all duration-200"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {/* Discount badge */}
      {discountPct && (
        <span className="absolute top-3 left-3 z-10 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--color-error)' }}>
          -{discountPct}%
        </span>
      )}
      {/* Wishlist */}
      <button
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'var(--color-surface)' }}
        aria-label="Add to wishlist"
      >
        <Heart size={15} style={{ color: 'var(--color-text-muted)' }} />
      </button>

      {/* Image */}
      <Link href={`/products/${product.slug}`}>
        <div className="aspect-square overflow-hidden" style={{ background: '#F8F9FA' }}>
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
          )}
        </div>
      </Link>

      <div className="p-4">
        {product.category && (
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-primary)' }}>
            {product.category.name}
          </p>
        )}
        <Link href={`/products/${product.slug}`}>
          <p className="font-semibold text-sm leading-snug line-clamp-2 mb-2 hover:underline" style={{ color: 'var(--color-text)' }}>
            {product.name}
          </p>
        </Link>
        <div className="flex items-center gap-2 mb-3">
          <p className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{formatPrice(product.price)}</p>
          {hasDiscount && (
            <p className="text-xs line-through" style={{ color: 'var(--color-text-subtle)' }}>{formatPrice(product.comparePrice!)}</p>
          )}
        </div>
        {product.inventory === 0 ? (
          <p className="text-xs font-semibold text-center py-2" style={{ color: 'var(--color-error)' }}>Out of stock</p>
        ) : (
          <button
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold border transition-colors"
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.background = 'var(--color-primary)'; b.style.color = '#fff' }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.background = 'transparent'; b.style.color = 'var(--color-primary)' }}
          >
            <ShoppingCart size={14} /> Add to Cart
          </button>
        )}
      </div>
    </div>
  )
}

type Props = {
  initialProducts: Product[]
  categories: Category[]
  initialCategoryId?: string
}

export default function ProductGrid({ initialProducts, categories, initialCategoryId }: Props) {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? '')
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest')
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    let result = initialProducts
    if (categoryId) result = result.filter(p => p.categoryId === categoryId)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
    }
    if (sortBy === 'price-asc') result = [...result].sort((a, b) => Number(a.price) - Number(b.price))
    else if (sortBy === 'price-desc') result = [...result].sort((a, b) => Number(b.price) - Number(a.price))
    return result
  }, [initialProducts, categoryId, search, sortBy])

  return (
    <div>
      {/* Search + filter bar */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-0 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-subtle)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
          />
          {search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
              <X size={15} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-5 p-4 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {/* Category */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>CATEGORY</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategoryId('')}
                className="px-3 py-1 rounded-full text-xs font-semibold border"
                style={{
                  background: !categoryId ? 'var(--color-primary)' : 'transparent',
                  color: !categoryId ? '#fff' : 'var(--color-text-muted)',
                  borderColor: !categoryId ? 'var(--color-primary)' : 'var(--color-border)',
                }}
              >
                All
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className="px-3 py-1 rounded-full text-xs font-semibold border"
                  style={{
                    background: categoryId === c.id ? 'var(--color-primary)' : 'transparent',
                    color: categoryId === c.id ? '#fff' : 'var(--color-text-muted)',
                    borderColor: categoryId === c.id ? 'var(--color-primary)' : 'var(--color-border)',
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          {/* Sort */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>SORT BY</p>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="rounded-lg border px-3 py-1.5 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
            >
              <option value="newest">Newest first</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
            </select>
          </div>
        </div>
      )}

      <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
        {filtered.length} product{filtered.length !== 1 ? 's' : ''} found
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>No products match your search</p>
          <button onClick={() => { setSearch(''); setCategoryId('') }} className="text-sm mt-2" style={{ color: 'var(--color-primary)' }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
