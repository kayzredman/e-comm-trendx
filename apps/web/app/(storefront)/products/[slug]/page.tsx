import { productsApi, type Product } from '@/lib/api'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'
import ProductGallery from './ProductGallery'
import ProductDetailsPanel from './ProductDetailsPanel'

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
          <ProductGallery product={product} />
          <ProductDetailsPanel product={product} />
        </div>
      </div>
    </div>
  )
}
