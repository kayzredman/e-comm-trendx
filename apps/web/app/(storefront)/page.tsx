import { productsApi, categoriesApi, type Product, type Category } from '@/lib/api'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'
import { ArrowRight, Truck, RotateCcw, Shield, Headphones, Heart, ShoppingCart, Shirt, ShoppingBag, BookOpen, Laptop, Watch, Star, Plane, Package } from 'lucide-react'

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
        <button className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500" style={{ color: '#9CA3AF' }}>
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
          {hasDiscount && (
            <span className="text-xs line-through" style={{ color: 'var(--color-text-subtle)' }}>{formatPrice(product.comparePrice!)}</span>
          )}
        </div>
        <button className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90" style={{ background: 'var(--color-primary)' }}>
          <ShoppingCart size={13} /> Add to Cart
        </button>
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

  return (
    <div style={{ background: 'var(--color-page)' }}>
      {/* Hero */}
      <section style={{ background: '#FFF8F0' }}>
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-20 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4" style={{ background: '#FEE2E2', color: '#DC2626' }}>
              🔥 New Arrivals 2026
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4" style={{ color: '#1A1A2E' }}>
              Discover the<br /><span style={{ color: 'var(--color-primary)' }}>Latest Trends</span>
            </h1>
            <p className="text-base mb-8 max-w-sm" style={{ color: '#6B7280' }}>
              Fresh styles, unbeatable prices. Fast delivery across Ghana. Shop thousands of products today.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/products" className="inline-flex items-center gap-2 font-bold px-6 py-3 rounded-xl text-sm text-white transition-opacity hover:opacity-90" style={{ background: 'var(--color-primary)' }}>
                Shop Now <ArrowRight size={16} />
              </Link>
              <Link href="/deals" className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl text-sm transition-colors border" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', background: 'white' }}>
                View Deals
              </Link>
            </div>
          </div>
          <div className="hidden md:flex items-center justify-center">
            <div className="relative w-72 h-72 rounded-3xl overflow-hidden flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#e0e7ff,#fce7f3)' }}>
              <span className="text-9xl">🛍️</span>
              <div className="absolute top-4 right-4 bg-white rounded-2xl shadow-md px-3 py-2 text-xs font-bold" style={{ color: '#DC2626' }}>-50% OFF</div>
              <div className="absolute bottom-4 left-4 bg-white rounded-2xl shadow-md px-3 py-2 text-xs font-bold" style={{ color: '#16A34A' }}>Free Delivery</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section style={{ background: 'white', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
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
            <h2 className="text-2xl font-extrabold" style={{ color: 'var(--color-text)' }}>Shop by Category</h2>
            <Link href="/products" className="text-sm font-semibold flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {categories.slice(0, 8).map((cat, i) => {
              const palette = CAT_COLORS[i % CAT_COLORS.length]
              const Icon = CAT_ICONS[i % CAT_ICONS.length]
              return (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl transition-transform hover:-translate-y-0.5 hover:shadow-md text-center"
                  style={{ background: palette.bg }}
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: palette.accent }}>
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

      {/* Deals strip */}
      {deals.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <h2 className="text-2xl font-extrabold" style={{ color: 'var(--color-text)' }}>Hot Deals</h2>
            </div>
            <Link href="/deals" className="text-sm font-semibold flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
              See all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {deals.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Featured products */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-extrabold" style={{ color: 'var(--color-text)' }}>Featured Products</h2>
          <Link href="/products" className="text-sm font-semibold flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
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
