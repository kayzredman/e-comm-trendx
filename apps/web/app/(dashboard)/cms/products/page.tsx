import Link from 'next/link'
import { productsApi, categoriesApi, type Product, type Category } from '@/lib/api'
import { Plus } from 'lucide-react'
import ProductsTable from './ProductsTable'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  let products: Product[] = []
  let categories: Category[] = []
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
        <ProductsTable products={products} categories={categories} />
      )}
    </div>
  )
}
