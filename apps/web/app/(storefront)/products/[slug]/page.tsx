import { productsApi, type Product } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ShoppingBag,
  ShoppingCart,
  Heart,
  Truck,
  RotateCcw,
  ShieldCheck,
  PackageCheck,
  ChevronRight,
} from 'lucide-react'
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

  const comparePrice = product.comparePrice
  const hasCompare = !!comparePrice && Number(comparePrice) > Number(product.price)
  const discount = hasCompare && comparePrice
    ? Math.round((1 - Number(product.price) / Number(comparePrice)) * 100)
    : null

  const lowStock = product.inventory > 0 && product.inventory < 10
  const outOfStock = product.inventory === 0

  return (
    <div style={{ background: 'var(--color-page)', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-1.5 text-xs mb-6 flex-wrap"
          style={{ color: 'var(--color-text-subtle)' }}
        >
          <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">
            Home
          </Link>
          <ChevronRight size={12} style={{ color: '#CBD5E1' }} />
          {product.category ? (
            <>
              <Link
                href={`/categories/${product.category.slug}`}
                className="hover:text-[var(--color-primary)] transition-colors"
              >
                {product.category.name}
              </Link>
              <ChevronRight size={12} style={{ color: '#CBD5E1' }} />
            </>
          ) : (
            <>
              <Link href="/products" className="hover:text-[var(--color-primary)] transition-colors">
                Products
              </Link>
              <ChevronRight size={12} style={{ color: '#CBD5E1' }} />
            </>
          )}
          <span className="font-semibold line-clamp-1" style={{ color: 'var(--color-text)' }}>
            {product.name}
          </span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-start">
          {/* Gallery */}
          <ProductGallery product={product} />

          {/* Info */}
          <div className="pt-1">
            {product.category && (
              <Link
                href={`/categories/${product.category.slug}`}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] mb-3"
                style={{ color: 'var(--color-primary)' }}
              >
                {product.category.name}
              </Link>
            )}

            <h1
              className="text-3xl lg:text-[32px] font-black leading-tight mb-4"
              style={{ color: 'var(--color-text)', letterSpacing: '-0.8px' }}
            >
              {product.name}
            </h1>

            {/* Price row */}
            <div
              className="flex items-baseline gap-2.5 flex-wrap pb-5 mb-5"
              style={{ borderBottom: '1.5px solid #F1F5F9' }}
            >
              <span
                className="font-black"
                style={{ color: 'var(--color-text)', fontSize: '36px', letterSpacing: '-1px' }}
              >
                {formatPrice(product.price)}
              </span>
              {hasCompare && comparePrice && (
                <span
                  className="line-through font-medium"
                  style={{ color: 'var(--color-text-subtle)', fontSize: '20px' }}
                >
                  {formatPrice(comparePrice)}
                </span>
              )}
              {discount && (
                <span
                  className="text-[13px] font-extrabold px-2.5 py-1 rounded-lg text-white"
                  style={{ background: 'linear-gradient(135deg,#F59E0B 0%,#EF4444 100%)' }}
                >
                  {discount}% OFF
                </span>
              )}
            </div>

            {product.description && (
              <p
                className="text-sm leading-relaxed mb-5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {product.description}
              </p>
            )}

            {/* Stock */}
            <div className="inline-flex items-center gap-2 mb-5 text-[13px] font-semibold">
              {outOfStock ? (
                <>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: 'var(--color-error)' }}
                  />
                  <span style={{ color: 'var(--color-error)' }}>Out of Stock</span>
                </>
              ) : (
                <>
                  <span className="relative flex w-2 h-2">
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ background: 'var(--color-success)' }}
                    />
                    <span
                      className="relative inline-flex rounded-full w-2 h-2"
                      style={{ background: 'var(--color-success)' }}
                    />
                  </span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>In Stock</span>
                  {lowStock && (
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      — Only {product.inventory} left!
                    </span>
                  )}
                </>
              )}
            </div>

            {product.sku && (
              <p className="text-xs mb-5" style={{ color: 'var(--color-text-subtle)' }}>
                SKU: {product.sku}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2.5 mb-5">
              <AddToCartButton
                product={product}
                disabled={outOfStock}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-[15px] font-extrabold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg,#2563EB 0%,#7C3AED 100%)',
                  boxShadow: '0 8px 32px rgba(37,99,235,0.25)',
                }}
                label={
                  <>
                    <ShoppingCart size={18} strokeWidth={2.5} />
                    Add to Cart
                  </>
                }
              />
              <button
                type="button"
                aria-label="Add to wishlist"
                className="w-[52px] h-[52px] rounded-xl flex items-center justify-center transition-transform hover:scale-[1.08]"
                style={{
                  background: '#FFF1F2',
                  border: '1.5px solid #FECDD3',
                  color: '#F43F5E',
                }}
              >
                <Heart size={22} />
              </button>
            </div>

            {/* Buy Now (secondary) */}
            <Link
              href={outOfStock ? '#' : '/checkout'}
              aria-disabled={outOfStock}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-colors mb-6"
              style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                color: outOfStock ? 'var(--color-text-subtle)' : 'var(--color-text)',
                pointerEvents: outOfStock ? 'none' : 'auto',
              }}
            >
              <ShoppingBag size={16} />
              Buy Now
            </Link>

            {/* Trust block */}
            <div
              className="flex flex-col gap-2.5 p-4 rounded-xl"
              style={{
                background: 'var(--color-surface-muted)',
                border: '1.5px solid #F1F5F9',
              }}
            >
              <TrustRow
                icon={<Truck size={16} style={{ color: 'var(--color-primary)' }} />}
                label="Free Delivery"
                detail="on orders over ₵200 — estimated 1–2 days"
              />
              <TrustRow
                icon={<RotateCcw size={16} style={{ color: 'var(--color-primary)' }} />}
                label="30-day returns"
                detail="hassle-free, no questions asked"
              />
              <TrustRow
                icon={<ShieldCheck size={16} style={{ color: 'var(--color-primary)' }} />}
                label="Secure payment"
                detail="MoMo, Visa, Mastercard accepted"
              />
              <TrustRow
                icon={<PackageCheck size={16} style={{ color: 'var(--color-primary)' }} />}
                label="Authentic product"
                detail="verified & quality-checked"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TrustRow({
  icon,
  label,
  detail,
}: {
  icon: React.ReactNode
  label: string
  detail: string
}) {
  return (
    <div className="flex items-center gap-2.5 text-[13px]" style={{ color: '#475569' }}>
      <span className="flex-shrink-0">{icon}</span>
      <span>
        <strong style={{ color: 'var(--color-text)' }}>{label}</strong> — {detail}
      </span>
    </div>
  )
}

