import { productsApi, categoriesApi, type Product, type Category } from '@/lib/api'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'
import { ArrowRight, Truck, RotateCcw, Shield, Headphones, Heart, Shirt, ShoppingBag, BookOpen, Laptop, Watch, Star, Plane, Package } from 'lucide-react'
import HeroCarousel from '@/components/storefront/HeroCarousel'

export const dynamic = 'force-dynamic'

const CAT_COLORS = [
  { bg: '#DCFCE7', accent: '#16A34A', text: '#166534' },
  { bg: '#FEE2E2', accent: '#DC2626', text: '#991B1B' },
  { bg: '#EDE9FE', accent: '#7C3AED', text: '#5B21B6' },
  { bg: '#DBEAFE', accent: '#2563EB', text: '#1E40AF' },
  { bg: '#CFFAFE', accent: '#0891B2', text: '#164E63' },
  { bg: '#FFEDD5', accent: '#EA580C', text: '#9A3412' },
  { bg: '#FEF3C7', accent: '#D97706', text: '#92400E' },
  { bg: '#FCE7F3', accent: '#BE185D', text: '#831843' },
]
const CAT_ICONS = [Shirt, ShoppingBag, BookOpen, Laptop, Plane, Watch, Star, Package]

const TRUST = [
  { icon: Truck, label: 'Free Delivery', sub: 'On orders over ₵200' },
  { icon: RotateCcw, label: 'Easy Returns', sub: '30-day return policy' },
  { icon: Shield, label: 'Secure Payment', sub: '100% protected' },
  { icon: Headphones, label: '24/7 Support', sub: 'Always here for you' },
]

function ProductCard({ product }: { product: Product }) {
  const hasDiscount = product.comparePrice && Number(product.comparePrice) > Number(product.price)
  const discountPct = hasDiscount
    ? Math.round(((Number(product.comparePrice) - Number(product.price)) / Number(product.comparePrice)) * 100)
    : 0

  return (
    <div className="group rounded-2xl overflow-hidden flex flex-col" style={{ background: 'var(--color-surface)', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
      <Link href={`/products/${product.slug}`} className="block relative overflow-hidden" style={{ background: 'var(--color-surface-muted)', aspectRatio: '1' }}>
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
        )}
        {hasDiscount && (
          <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#DC2626' }}>-{discountPct}%</span>
        )}
        <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:text-red-500 shadow-sm" style={{ color: '#9CA3AF' }}>
          <Heart size={15} />
        </button>
      </Link>
      <div className="p-3 flex flex-col flex-1">
        {product.category && (
          <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-primary)' }}>{product.category.name}</p>
        )}
        <Link href={`/products/${product.slug}`} className="font-semibold text-sm leading-snug line-clamp-2 flex-1 mb-2" style={{ color: 'var(--color-text)' }}>
          {product.name}
        </Link>
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-xs line-through" style={{ color: 'var(--color-text-subtle)' }}>{formatPrice(product.comparePrice!)}</span>
          )}
        </div>
        <Link
          href={`/products/${product.slug}`}
          className="block w-full py-2.5 text-center text-xs font-bold tracking-wide rounded-xl border-2 transition-all duration-200 hover:text-white"
          style={{ borderColor: '#111827', color: '#111827' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#111827' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
        >
          Add to Cart
        </Link>
      </div>
    </div>
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
  const deals = products.filter(p => p.comparePrice && Number(p.comparePrice) > Number(p.price)).slice(0, 4)
  const newArrivals = products.slice(0, 4)

  return (
    <div style={{ background: 'var(--color-page)' }}>
      {/* Hero Carousel */}
      <HeroCarousel />

      {/* Trust strip */}
      <section style={{ background: 'white', borderBottom: '1px solid #F3F4F6' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {TRUST.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-primary-light)' }}>
                <Icon size={18} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div>
                <p className="text-sm font-bold leading-none" style={{ color: 'var(--color-text)' }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-extrabold" style={{ color: 'var(--color-text)' }}>Shop by Category</h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Find exactly what you're looking for</p>
            </div>
            <Link href="/products" className="text-sm font-semibold flex items-center gap-1 hidden sm:flex" style={{ color: 'var(--color-primary)' }}>
              All products <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {categories.slice(0, 8).map((cat, i) => {
              const palette = CAT_COLORS[i % CAT_COLORS.length]
              const Icon = CAT_ICONS[i % CAT_ICONS.length]
              return (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg text-center"
                  style={{ background: palette.bg }}
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md" style={{ background: palette.accent }}>
                    {cat.imageUrl
                      ? <img src={cat.imageUrl} alt={cat.name} className="w-10 h-10 rounded-full object-cover" />
                      : <Icon size={26} color="white" />
                    }
                  </div>
                  <span className="text-sm font-bold leading-tight" style={{ color: palette.text }}>{cat.name}</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Hot Deals banner */}
      {deals.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-10">
          <div className="flex items-center justify-between mb-8 pb-5" style={{ borderBottom: '1.5px solid #F3F4F6' }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] mb-1.5 flex items-center gap-2">
                <span className="inline-block w-5 h-0.5 rounded-full" style={{ background: 'var(--color-primary)' }} />
                <span style={{ color: 'var(--color-primary)' }}>Today&apos;s Picks</span>
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold" style={{ color: '#0F0F0F' }}>Best Deals Right Now</h2>
            </div>
            <Link href="/deals" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold border-b pb-0.5 transition-opacity hover:opacity-50" style={{ color: '#0F0F0F', borderColor: '#0F0F0F' }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {deals.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-10">
          <div className="flex items-center justify-between mb-8 pb-5" style={{ borderBottom: '1.5px solid #F3F4F6' }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] mb-1.5 flex items-center gap-2">
                <span className="inline-block w-5 h-0.5 rounded-full" style={{ background: 'var(--color-primary)' }} />
                <span style={{ color: 'var(--color-primary)' }}>Just Dropped</span>
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold" style={{ color: '#0F0F0F' }}>New Arrivals</h2>
            </div>
            <Link href="/new" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold border-b pb-0.5 transition-opacity hover:opacity-50" style={{ color: '#0F0F0F', borderColor: '#0F0F0F' }}>
              Explore all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {newArrivals.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Promo banner */}
      <section className="max-w-6xl mx-auto px-4 pb-10">
        <div
          className="rounded-3xl overflow-hidden relative flex items-center justify-between px-8 py-10 gap-6"
          style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #0891B2 100%)' }}
        >
          <div className="text-white max-w-sm">
            <p className="text-sm font-bold uppercase tracking-widest opacity-75 mb-2">Free Delivery</p>
            <h3 className="text-3xl font-extrabold mb-2">On orders over ₵200</h3>
            <p className="text-sm opacity-80 mb-6">Shop more, save more. All across Ghana.</p>
            <Link href="/products" className="inline-flex items-center gap-2 bg-white font-bold px-6 py-3 rounded-2xl text-sm transition-transform hover:scale-105" style={{ color: '#1E40AF' }}>
              Shop now <ArrowRight size={16} />
            </Link>
          </div>
          <div className="hidden md:block text-8xl opacity-30 select-none">🚚</div>
          <div className="absolute right-0 top-0 w-64 h-64 rounded-full opacity-10 translate-x-1/3 -translate-y-1/3" style={{ background: 'white' }} />
        </div>
      </section>

      {/* All featured products */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-8 pb-5" style={{ borderBottom: '1.5px solid #F3F4F6' }}>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] mb-1.5 flex items-center gap-2">
              <span className="inline-block w-5 h-0.5 rounded-full" style={{ background: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--color-primary)' }}>Curated For You</span>
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold" style={{ color: '#0F0F0F' }}>Featured Products</h2>
          </div>
          <Link href="/products" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold border-b pb-0.5 transition-opacity hover:opacity-50" style={{ color: '#0F0F0F', borderColor: '#0F0F0F' }}>
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {featured.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>Products coming soon!</p>
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
