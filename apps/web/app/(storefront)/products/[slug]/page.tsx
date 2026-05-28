import { productsApi, type Product } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ShoppingBag, Tag, Truck, RotateCcw, Home, ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'
import ProductGallery from './ProductGallery'
import AddToCartButton from '@/components/storefront/AddToCartButton'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  let product: Product | null = null
  try { product = await productsApi.getBySlug(slug) } catch {}
  if (!product) return { title: 'Product not found' }
  const ogImage =
    product.imageAssets?.find((a) => a.isPrimary)?.urls.detail ??
    product.imageAssets?.[0]?.urls.detail ??
    product.images?.[0]
  return {
    title: `${product.name} — trendMarga`,
    description: product.description ?? `Buy ${product.name} on trendMarga`,
    openGraph: { images: ogImage ? [ogImage] : [] },
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

  const lowStock = product.inventory > 0 && product.inventory < 10

  return (
    <div className="max-w-6xl mx-auto px-4 py-6" style={{ background: 'var(--color-page)' }}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
        <Link href="/" className="flex items-center gap-1 hover:underline"><Home size={12} /> Home</Link>
        <ChevronRight size={12} />
        {product.category ? (
          <>
            <Link href={`/categories/${product.category.slug}`} className="hover:underline">{product.category.name}</Link>
            <ChevronRight size={12} />
          </>
        ) : (
          <>
            <Link href="/products" className="hover:underline">Products</Link>
            <ChevronRight size={12} />
          </>
        )}
        <span className="font-medium line-clamp-1" style={{ color: 'var(--color-text)' }}>{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Gallery — client component for thumbnail click */}
        <ProductGallery product={product} />

        {/* Info */}
        <div>
          {product.category && (
            <Link
              href={`/categories/${product.category.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide mb-3"
              style={{ color: 'var(--color-primary)' }}
            >
              <Tag size={12} /> {product.category.name}
            </Link>
          )}

          <h1 className="text-2xl md:text-3xl font-extrabold leading-tight mb-4" style={{ color: 'var(--color-text)' }}>
            {product.name}
          </h1>

          {/* Price row */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
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
            <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--color-text-muted)' }}>
              {product.description}
            </p>
          )}

          {/* Stock status */}
          <div className="mb-5">
            {product.inventory === 0 ? (
              <span className="text-sm font-semibold" style={{ color: '#DC2626' }}>● Out of stock</span>
            ) : lowStock ? (
              <span className="text-sm font-semibold" style={{ color: '#D97706' }}>● Only {product.inventory} left in stock!</span>
            ) : (
              <span className="text-sm font-semibold" style={{ color: '#16A34A' }}>● In stock</span>
            )}
          </div>

          {product.sku && (
            <p className="text-xs mb-5" style={{ color: 'var(--color-text-subtle)' }}>SKU: {product.sku}</p>
          )}

          {/* Quantity + CTA */}
          <div className="space-y-3">
            <Link
              href="/checkout"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-base font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: product.inventory === 0 ? '#9CA3AF' : 'var(--color-primary)', pointerEvents: product.inventory === 0 ? 'none' : 'auto' }}
            >
              <ShoppingBag size={20} />
              Buy Now
            </Link>
            <AddToCartButton
              product={product}
              disabled={product.inventory === 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-2"
              style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', background: 'white' } as React.CSSProperties}
            />
          </div>

          {/* Trust badges */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#F0FDF4' }}>
              <Truck size={18} style={{ color: '#16A34A' }} />
              <div>
                <p className="text-xs font-bold" style={{ color: '#166534' }}>Free Delivery</p>
                <p className="text-xs" style={{ color: '#15803D' }}>On orders over ₵200</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#EFF6FF' }}>
              <RotateCcw size={18} style={{ color: '#2563EB' }} />
              <div>
                <p className="text-xs font-bold" style={{ color: '#1E40AF' }}>Return Delivery</p>
                <p className="text-xs" style={{ color: '#1D4ED8' }}>30-day returns</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

