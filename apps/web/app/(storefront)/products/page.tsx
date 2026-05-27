import { productsApi, categoriesApi, type Product, type Category } from '@/lib/api'
import ProductGrid from './ProductGrid'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ categoryId?: string; q?: string }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const { categoryId, q } = await searchParams

  let products: Product[] = []
  let categories: Category[] = []
  try {
    ;[products, categories] = await Promise.all([
      productsApi.list({ status: 'ACTIVE', search: q, categoryId }),
      categoriesApi.list(),
    ])
  } catch { /* API not running */ }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" style={{ background: 'var(--color-page)' }}>
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text)' }}>All Products</h1>
      <ProductGrid
        key={`${q ?? ''}::${categoryId ?? ''}`}
        initialProducts={products}
        categories={categories}
        initialCategoryId={categoryId}
        initialSearch={q}
      />
    </div>
  )
}

