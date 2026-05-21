import { productsApi, type Product } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'
import { Tag, Heart, ShoppingCart } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hot Deals — TrendMarga',
  description: 'Shop the best deals and discounts on TrendMarga',
}

export const dynamic = 'force-dynamic'

function DealCard({ product }: { product: Product }) {
  const discountPct = Math.round(((Number(product.comparePrice) - Number(product.price)) / Number(product.comparePrice)) * 100)
  const saving = Number(product.comparePrice) - Number(product.price)

  return (
    <div className="group rounded-2xl overflow-hidden flex flex-col" style={{ background: 'var(--color-surface)', boxShadow: '0 1px 3px rgba(0,0,0,.07)' }}>
      <Link href={`/products/${product.slug}`} className="block relative aspect-square overflow-hidden" style={{ background: 'var(--color-surface-muted)' }}>
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
        )}
        <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#DC2626' }}>-{discountPct}%</span>
        <button onClick={e => e.preventDefault()} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500" style={{ color: '#9CA3AF' }}>
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
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{formatPrice(product.price)}</span>
          <span className="text-xs line-through" style={{ color: 'var(--color-text-subtle)' }}>{formatPrice(product.comparePrice!)}</span>
        </div>
        <p className="text-xs mb-2" style={{ color: '#16A34A' }}>You save {formatPrice(String(saving))}</p>
        <button disabled={product.inventory === 0} className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-40" style={{ background: 'var(--color-primary)' }}>
          <ShoppingCart size={13} /> {product.inventory === 0 ? 'Out of stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  )
}

export default async function DealsPage() {
  let products: Product[] = []
  try { products = await productsApi.list({ status: 'ACTIVE' }) } catch {}

  const deals = products.filter(p => p.comparePrice && Number(p.comparePrice) > Number(p.price))

  return (
    <div style={{ background: 'var(--color-page)', minHeight: '60vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #DC2626, #F87171)', color: 'white' }}>
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-2">
            <Tag size={28} />
            <h1 className="text-3xl font-extrabold">Hot Deals</h1>
          </div>
          <p className="text-sm opacity-90">Exclusive discounts on top products — limited time only!</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {deals.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p className="text-4xl mb-3">🏷️</p>
            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>No deals right now — check back soon!</p>
            <Link href="/products" className="text-sm mt-2 inline-block" style={{ color: 'var(--color-primary)' }}>Browse all products</Link>
          </div>
        ) : (
          <>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>{deals.length} deal{deals.length !== 1 ? 's' : ''} available</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {deals.map(p => <DealCard key={p.id} product={p} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
