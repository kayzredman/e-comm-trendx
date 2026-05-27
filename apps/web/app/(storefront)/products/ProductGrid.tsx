'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { type Product, type Category } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { Search, X, Heart, ShoppingCart } from 'lucide-react'
import AddToCartButton from '@/components/storefront/AddToCartButton'

function ProductCard({ product }: { product: Product }) {
  const hasDiscount = product.comparePrice && Number(product.comparePrice) > Number(product.price)
  const discountPct = hasDiscount
    ? Math.round(((Number(product.comparePrice) - Number(product.price)) / Number(product.comparePrice)) * 100)
    : 0

  return (
    <div className="group rounded-2xl overflow-hidden flex flex-col" style={{ background: 'var(--color-surface)', boxShadow: '0 1px 3px rgba(0,0,0,.07)' }}>
      <Link href={`/products/${product.slug}`} className="block relative aspect-square overflow-hidden" style={{ background: 'var(--color-surface-muted)' }}>
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
        )}
        {hasDiscount && (
          <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#DC2626' }}>-{discountPct}%</span>
        )}
        {product.inventory === 0 && (
          <span className="absolute bottom-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#6B7280' }}>Out of stock</span>
        )}
        <button
          onClick={e => e.preventDefault()}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
          style={{ color: '#9CA3AF' }}
        >
          <Heart size={14} />
        </button>
      </Link>
      <div className="p-3 flex flex-col flex-1">
        {product.category && (
          <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-primary)' }}>{product.category.name}</p>
        )}
        <Link href={`/products/${product.slug}`} className="font-semibold text-sm leading-snug line-clamp-2 flex-1" style={{ color: 'var(--color-text)' }}>
          {product.name}
        </Link>
        <div className="flex items-center gap-1.5 mt-1.5 mb-2">
          <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-xs line-through" style={{ color: 'var(--color-text-subtle)' }}>{formatPrice(product.comparePrice!)}</span>
          )}
        </div>
        <AddToCartButton
          product={product}
          disabled={product.inventory === 0}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: 'var(--color-primary)' }}
          label={<><ShoppingCart size={13} /> {product.inventory === 0 ? 'Out of stock' : 'Add to Cart'}</>}
        />
      </div>
    </div>
  )
}

type Props = {
  initialProducts: Product[]
  categories: Category[]
  initialCategoryId?: string
  initialSearch?: string
}

export default function ProductGrid({ initialProducts, categories, initialCategoryId, initialSearch }: Props) {
  const [search, setSearch] = useState(initialSearch ?? '')
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? '')
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest')

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
      {/* Search bar */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex-1 min-w-0 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-subtle)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
          />
          {search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
              <X size={15} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          )}
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          <option value="newest">Newest first</option>
          <option value="price-asc">Price: Low → High</option>
          <option value="price-desc">Price: High → Low</option>
        </select>
      </div>

      {/* Category pills — always visible */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setCategoryId('')}
          className="px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors"
          style={{
            background: !categoryId ? 'var(--color-primary)' : 'white',
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
            className="px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors"
            style={{
              background: categoryId === c.id ? 'var(--color-primary)' : 'white',
              color: categoryId === c.id ? '#fff' : 'var(--color-text-muted)',
              borderColor: categoryId === c.id ? 'var(--color-primary)' : 'var(--color-border)',
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

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


