import { productsApi, type Product } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'
import { Sparkles, Heart, ShoppingCart } from 'lucide-react'
import AddToCartButton from '@/components/storefront/AddToCartButton'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "What's New — trendMarga",
  description: 'Discover the latest arrivals on trendMarga',
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
        <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#7C3AED' }}>NEW</span>
        {hasDiscount && (
          <span className="absolute top-8 left-2 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#DC2626' }}>-{discountPct}%</span>
        )}
        <button type="button" aria-hidden tabIndex={-1} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 pointer-events-none" style={{ color: '#9CA3AF' }}>
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

export default async function WhatsNewPage() {
  let products: Product[] = []
  try { products = await productsApi.list({ status: 'ACTIVE' }) } catch {}

  // API already sorts by createdAt DESC — take the 20 most recent
  const newArrivals = products.slice(0, 20)

  return (
    <div style={{ background: 'var(--color-page)', minHeight: '60vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', color: 'white' }}>
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles size={28} />
            <h1 className="text-3xl font-extrabold">What&apos;s New</h1>
          </div>
          <p className="text-sm opacity-90">The freshest arrivals — just landed on trendMarga</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {newArrivals.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p className="text-4xl mb-3">✨</p>
            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>New products coming soon!</p>
            <Link href="/products" className="text-sm mt-2 inline-block" style={{ color: 'var(--color-primary)' }}>Browse all products</Link>
          </div>
        ) : (
          <>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>Showing {newArrivals.length} latest arrivals</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {newArrivals.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
