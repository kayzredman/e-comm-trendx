import { categoriesApi, type Category, type Product } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Heart, ShoppingCart, Home, ChevronRight } from 'lucide-react'
import AddToCartButton from '@/components/storefront/AddToCartButton'
import type { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  let cat: Category | null = null
  try { cat = await categoriesApi.getBySlug(slug) } catch {}
  if (!cat) return { title: 'Category not found' }
  return { title: `${cat.name} — TrendMarga`, description: `Shop all ${cat.name} products on TrendMarga` }
}

export const dynamic = 'force-dynamic'

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
        <button onClick={e => e.preventDefault()} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500" style={{ color: '#9CA3AF' }}>
          <Heart size={14} />
        </button>
      </Link>
      <div className="p-3 flex flex-col flex-1">
        <Link href={`/products/${product.slug}`} className="font-semibold text-sm leading-snug line-clamp-2 flex-1" style={{ color: 'var(--color-text)' }}>
          {product.name}
        </Link>
        <div className="flex items-center gap-1.5 mt-1.5 mb-2">
          <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{formatPrice(product.price)}</span>
          {hasDiscount && <span className="text-xs line-through" style={{ color: 'var(--color-text-subtle)' }}>{formatPrice(product.comparePrice!)}</span>}
        </div>
        <AddToCartButton
          product={product}
          disabled={product.inventory === 0}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-40"
          style={{ background: 'var(--color-primary)' }}
          label={<><ShoppingCart size={13} /> {product.inventory === 0 ? 'Out of stock' : 'Add to Cart'}</>}
        />
      </div>
    </div>
  )
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params

  let category: Category | null = null
  try { category = await categoriesApi.getBySlug(slug) } catch {}
  if (!category) notFound()

  const products: Product[] = (category.products ?? []) as unknown as Product[]

  return (
    <div style={{ background: 'var(--color-page)', minHeight: '60vh' }}>
      {/* Category header */}
      <div style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
            <Link href="/" className="flex items-center gap-1 hover:underline"><Home size={12} /> Home</Link>
            <ChevronRight size={12} />
            <Link href="/products" className="hover:underline">Products</Link>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--color-text)' }}>{category.name}</span>
          </nav>
          <div className="flex items-center gap-4">
            {category.imageUrl && (
              <img src={category.imageUrl} alt={category.name} className="w-14 h-14 rounded-2xl object-cover" />
            )}
            <div>
              <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text)' }}>{category.name}</h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {products.length} product{products.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Products grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {products.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p className="text-4xl mb-3">🛍️</p>
            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>No products in this category yet</p>
            <Link href="/products" className="text-sm mt-2 inline-block" style={{ color: 'var(--color-primary)' }}>Browse all products</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
