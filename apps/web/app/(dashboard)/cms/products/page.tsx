import Link from 'next/link'
import { productsApi, categoriesApi, type Product } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { Plus, Pencil } from 'lucide-react'
import ProductDeleteButton from './ProductDeleteButton'

export const dynamic = 'force-dynamic'

const statusStyle: Record<string, { label: string; bg: string; color: string }> = {
  ACTIVE:   { label: 'Active',   bg: '#DCFCE7', color: '#16A34A' },
  DRAFT:    { label: 'Draft',    bg: '#FEF9C3', color: '#CA8A04' },
  ARCHIVED: { label: 'Archived', bg: '#F3F4F6', color: '#6B7280' },
}

export default async function ProductsPage() {
  let products: Product[] = []
  let categories = []
  try {
    ;[products, categories] = await Promise.all([productsApi.list(), categoriesApi.list()])
  } catch {
    // API not running — graceful
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Products</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {products.length} product{products.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/cms/products/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus size={16} /> New product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>No products yet</p>
          <p className="text-sm mt-1 mb-4" style={{ color: 'var(--color-text-subtle)' }}>Add your first product to get started</p>
          <Link
            href="/cms/products/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={16} /> New product
          </Link>
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
              {products.map(product => {
                const s = statusStyle[product.status] ?? statusStyle.DRAFT
                return (
                  <tr key={product.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.images?.[0] ? (
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
                      {product.comparePrice && (
                        <span className="text-xs line-through ml-1.5" style={{ color: 'var(--color-text-subtle)' }}>
                          {formatPrice(product.comparePrice)}
                        </span>
                      )}
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
    </div>
  )
}
