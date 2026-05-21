'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { type Product, type Category } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { Search, SlidersHorizontal, X } from 'lucide-react'

function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group rounded-2xl border overflow-hidden hover:shadow-md transition-shadow"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="aspect-square overflow-hidden" style={{ background: 'var(--color-surface-muted)' }}>
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
        )}
      </div>
      <div className="p-4">
        {product.category && (
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-primary)' }}>
            {product.category.name}
          </p>
        )}
        <p className="font-semibold text-sm leading-snug line-clamp-2" style={{ color: 'var(--color-text)' }}>{product.name}</p>
        <div className="flex items-center gap-2 mt-2">
          <p className="font-bold" style={{ color: 'var(--color-text)' }}>{formatPrice(product.price)}</p>
          {product.comparePrice && Number(product.comparePrice) > Number(product.price) && (
            <p className="text-sm line-through" style={{ color: 'var(--color-text-subtle)' }}>{formatPrice(product.comparePrice)}</p>
          )}
        </div>
        {product.inventory === 0 && (
          <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--color-error)' }}>Out of stock</p>
        )}
      </div>
    </Link>
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
