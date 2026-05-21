import { productsApi, type Product } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShoppingBag, Tag, Truck, RefreshCw, ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  let product: Product | null = null
  try { product = await productsApi.getBySlug(slug) } catch {}
  if (!product) return { title: 'Product not found' }
  return {
    title: `${product.name} — TrendMarga`,
    description: product.description ?? `Buy ${product.name} on TrendMarga`,
    openGraph: { images: product.images?.[0] ? [product.images[0]] : [] },
  }
}

export const dynamic = 'force-dynamic'

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params

  let product: Product | null = null
  try { product = await productsApi.getBySlug(slug) } catch {}

  if (!product || product.status !== 'ACTIVE') notFound()

  const discount = product.comparePrice && Number(product.comparePrice) > Number(product.price)
    ? Math.round((1 - Number(product.price) / Number(product.comparePrice)) * 100)
    : null

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" style={{ background: 'var(--color-page)' }}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs mb-6 flex-wrap" style={{ color: 'var(--color-text-muted)' }}>
        <Link href="/" className="hover:underline" style={{ color: 'var(--color-primary)' }}>Home</Link>
        <ChevronRight size={12} />
        <Link href="/products" className="hover:underline" style={{ color: 'var(--color-primary)' }}>Products</Link>
        {product.category && (
          <>
            <ChevronRight size={12} />
            <Link href={`/products?categoryId=${product.categoryId}`} className="hover:underline" style={{ color: 'var(--color-primary)' }}>
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight size={12} />
        <span className="truncate max-w-[180px]" style={{ color: 'var(--color-text-subtle)' }}>{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image(s) */}
        <div className="space-y-3">
          <div
            className="aspect-square rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-surface-muted)' }}
          >
            {product.images?.[0] ? (
              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl">📦</div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {product.images.slice(1).map((img, i) => (
                <img key={i} src={img} alt="" className="w-20 h-20 rounded-xl object-cover border" style={{ borderColor: 'var(--color-border)' }} />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.category && (
            <Link
              href={`/products?categoryId=${product.categoryId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide mb-3"
              style={{ color: 'var(--color-primary)' }}
            >
              <Tag size={12} /> {product.category.name}
            </Link>
          )}

          <h1 className="text-3xl font-extrabold leading-tight mb-3" style={{ color: 'var(--color-text)' }}>
            {product.name}
          </h1>

          {/* Price */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              {formatPrice(product.price)}
            </span>
            {product.comparePrice && Number(product.comparePrice) > Number(product.price) && (
              <span className="text-xl line-through" style={{ color: 'var(--color-text-subtle)' }}>
                {formatPrice(product.comparePrice)}
              </span>
            )}
            {discount && (
              <span className="text-sm font-bold px-2.5 py-0.5 rounded-full" style={{ background: '#DCFCE7', color: '#16A34A' }}>
                -{discount}% OFF
              </span>
            )}
          </div>

          {product.description && (
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-text-muted)' }}>
              {product.description}
            </p>
          )}

          {/* Stock */}
          <p className="text-sm mb-6 font-medium" style={{ color: product.inventory > 0 ? '#16A34A' : 'var(--color-error)' }}>
            {product.inventory > 0
              ? product.inventory < 10
                ? `Only ${product.inventory} left in stock!`
                : 'In stock'
              : 'Out of stock'}
          </p>

          {product.sku && (
            <p className="text-xs mb-5" style={{ color: 'var(--color-text-subtle)' }}>SKU: {product.sku}</p>
          )}

          {/* Add to cart + Buy Now */}
          <div className="flex gap-3 mb-5">
            <button
              disabled={product.inventory === 0}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', background: 'transparent' }}
            >
              <ShoppingBag size={18} />
              {product.inventory === 0 ? 'Out of stock' : 'Add to Cart'}
            </button>
            <button
              disabled={product.inventory === 0}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}
            >
              Buy Now
            </button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="flex items-center gap-2 p-3 rounded-xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}>
              <Truck size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>Free Delivery</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Orders over GH₵ 200</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}>
              <RefreshCw size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>Free Returns</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>7-day return policy</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
