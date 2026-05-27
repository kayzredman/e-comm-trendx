'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, X, Pencil } from 'lucide-react'
import type { Product, Category } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import ProductDeleteButton from './ProductDeleteButton'

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  ACTIVE:   { label: 'Active',   bg: '#DCFCE7', color: '#16A34A' },
  DRAFT:    { label: 'Draft',    bg: '#FEF9C3', color: '#CA8A04' },
  ARCHIVED: { label: 'Archived', bg: '#F3F4F6', color: '#6B7280' },
}

type Props = { products: Product[]; categories: Category[] }

export default function ProductsTable({ products, categories }: Props) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'' | 'ACTIVE' | 'DRAFT' | 'ARCHIVED'>('')
  const [categoryId, setCategoryId] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (status && p.status !== status) return false
      if (categoryId && p.categoryId !== categoryId) return false
      if (q) {
        const hay = `${p.name} ${p.sku ?? ''} ${p.description ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [products, search, status, categoryId])

  return (
    <>
      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-subtle)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, description…"
            className="w-full rounded-lg border pl-9 pr-9 py-2 text-sm outline-none focus:ring-2"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-subtle)' }}>
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <span className="text-xs self-center" style={{ color: 'var(--color-text-muted)' }}>
          {filtered.length} of {products.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>No products match these filters</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-x-auto" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-muted)' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Product</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Category</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Price</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Inventory</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const s = STATUS_STYLE[product.status] ?? STATUS_STYLE.DRAFT
                return (
                  <tr key={product.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.images[0]} alt={product.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-lg" style={{ background: 'var(--color-surface-muted)' }}>📦</div>
                        )}
                        <div>
                          <p className="font-medium" style={{ color: 'var(--color-text)' }}>{product.name}</p>
                          {product.sku && <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>SKU: {product.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>
                      {product.category?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                      {formatPrice(product.price)}
                    </td>
                    <td className="px-4 py-3" style={{ color: product.inventory === 0 ? 'var(--color-error)' : 'var(--color-text-muted)' }}>
                      {product.inventory}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/cms/products/${product.id}/edit`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border mr-2"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      >
                        <Pencil size={13} /> Edit
                      </Link>
                      <ProductDeleteButton id={product.id} name={product.name} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
