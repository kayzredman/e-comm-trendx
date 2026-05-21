import { productsApi, categoriesApi, type Product, type Category } from '@/lib/api'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group rounded-2xl border overflow-hidden hover:shadow-md transition-shadow"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="aspect-square overflow-hidden" style={{ background: 'var(--color-surface-muted)' }}>
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
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
        <p className="font-semibold text-sm leading-snug line-clamp-2" style={{ color: 'var(--color-text)' }}>
          {product.name}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <p className="font-bold" style={{ color: 'var(--color-text)' }}>{formatPrice(product.price)}</p>
          {product.comparePrice && Number(product.comparePrice) > Number(product.price) && (
            <p className="text-sm line-through" style={{ color: 'var(--color-text-subtle)' }}>{formatPrice(product.comparePrice)}</p>
          )}
        </div>
      </div>
    </Link>
  )
}

export default async function StorefrontHome() {
  let products: Product[] = []
  let categories: Category[] = []
  try {
    ;[products, categories] = await Promise.all([
      productsApi.list({ status: 'ACTIVE' }),
      categoriesApi.list(),
    ])
  } catch { /* API not running */ }

  const featured = products.slice(0, 8)

  return (
    <div style={{ background: 'var(--color-page)' }}>
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%)' }}
      >
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-32 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3 opacity-80">New arrivals · 2026</p>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight max-w-xl mb-6">
            Shop the Latest Trends
          </h1>
          <p className="text-lg opacity-80 max-w-md mb-8">
            Fast delivery across Ghana. Fresh styles, unbeatable prices.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-white font-semibold px-6 py-3 rounded-xl text-base transition-opacity hover:opacity-90"
            style={{ color: 'var(--color-primary)' }}
          >
            Shop now <ArrowRight size={18} />
          </Link>
        </div>
        {/* Decorative circle */}
        <div className="absolute right-0 top-0 w-96 h-96 rounded-full opacity-10 translate-x-1/3 -translate-y-1/3 bg-white" />
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-xl font-bold mb-5" style={{ color: 'var(--color-text)' }}>Shop by category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={`/products?categoryId=${cat.id}`}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border hover:shadow-sm transition-shadow text-center"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                {cat.imageUrl ? (
                  <img src={cat.imageUrl} alt={cat.name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ background: 'var(--color-primary-light)' }}>🏷️</div>
                )}
                <span className="text-xs font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Featured products</h2>
          <Link href="/products" className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {featured.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>Products coming soon — check back later!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {featured.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </div>
  )
}
