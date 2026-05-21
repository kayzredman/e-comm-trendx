import { productsApi, categoriesApi, type Product, type Category } from '@/lib/api'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'
import { ArrowRight, ShoppingCart, Heart, Truck, RefreshCw, ShieldCheck, Star } from 'lucide-react'

export const dynamic = 'force-dynamic'

// ── Colour palette for category cards (cycles) ─────────────────────────────
const CAT_COLORS = [
  { bg: '#16A34A', accent: '#BBF7D0' },
  { bg: '#DC2626', accent: '#FECACA' },
  { bg: '#2563EB', accent: '#BFDBFE' },
  { bg: '#0891B2', accent: '#A5F3FC' },
  { bg: '#7C3AED', accent: '#DDD6FE' },
  { bg: '#D97706', accent: '#FDE68A' },
]

// ── Shared product card (used on homepage and can be re-exported) ──────────
function ProductCard({ product }: { product: Product }) {
  const hasDiscount = product.comparePrice && Number(product.comparePrice) > Number(product.price)
  const discountPct = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.comparePrice!)) * 100)
    : null

  return (
    <div className="group relative rounded-2xl border overflow-hidden hover:shadow-lg transition-all duration-200"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {/* Discount badge */}
      {discountPct && (
        <span className="absolute top-3 left-3 z-10 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--color-error)' }}>
          -{discountPct}%
        </span>
      )}
      {/* Wishlist button */}
      <button
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'var(--color-surface)' }}
        aria-label="Add to wishlist"
      >
        <Heart size={15} style={{ color: 'var(--color-text-muted)' }} />
      </button>

      {/* Image */}
      <Link href={`/products/${product.slug}`}>
        <div className="aspect-square overflow-hidden" style={{ background: '#F8F9FA' }}>
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
          )}
        </div>
      </Link>

      <div className="p-4">
        {product.category && (
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--color-primary)' }}>
            {product.category.name}
          </p>
        )}
        <Link href={`/products/${product.slug}`}>
          <p className="font-semibold text-sm leading-snug line-clamp-2 mb-2 hover:underline" style={{ color: 'var(--color-text)' }}>
            {product.name}
          </p>
        </Link>
        <div className="flex items-center gap-2 mb-3">
          <p className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{formatPrice(product.price)}</p>
          {hasDiscount && (
            <p className="text-xs line-through" style={{ color: 'var(--color-text-subtle)' }}>{formatPrice(product.comparePrice!)}</p>
          )}
        </div>
        <button
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold border transition-colors hover:text-white"
          style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary)' }}
        >
          <ShoppingCart size={14} /> Add to Cart
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

  return (
    <div style={{ background: 'var(--color-page)' }}>

      {/* ── HERO (Option A) ─────────────────────────────────────────────── */}
      <section style={{ background: '#FFFAF5' }}>
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-20 grid md:grid-cols-2 gap-10 items-center">

          {/* Left — copy */}
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5"
              style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
              🔥 New Arrivals · Up to 50% Off
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4" style={{ color: '#111827' }}>
              Discover Your<br />
              <span style={{ color: 'var(--color-primary)' }}>New Style</span>
            </h1>
            <p className="text-lg mb-8 max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
              Fast delivery across Ghana. Fresh styles, unbeatable prices — every week.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-base text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}
              >
                Shop Now <ArrowRight size={18} />
              </Link>
              <Link
                href="#categories"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-base border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', background: 'var(--color-surface)' }}
              >
                Browse Categories
              </Link>
            </div>
          </div>

          {/* Right — decorative panel */}
          <div className="hidden md:block">
            <div className="relative rounded-3xl overflow-hidden aspect-square max-w-md ml-auto"
              style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 60%, #BFDBFE 100%)' }}>
              {/* Centre icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <ShoppingCart size={110} strokeWidth={1} style={{ color: '#2563EB', opacity: 0.12 }} />
              </div>
              {/* Floating info cards */}
              <div className="absolute top-6 right-6 bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <p className="text-xs font-bold leading-none mb-0.5" style={{ color: '#111827' }}>New Styles</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>Every Week</p>
                </div>
              </div>
              <div className="absolute bottom-6 left-6 bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">🚀</span>
                <div>
                  <p className="text-xs font-bold leading-none mb-0.5" style={{ color: '#111827' }}>Fast Delivery</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>Across Ghana</p>
                </div>
              </div>
              <div className="absolute bottom-6 right-6 bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="text-xs font-bold leading-none mb-0.5" style={{ color: '#111827' }}>Best Prices</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>Guaranteed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ─────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-6xl mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Truck size={22} />, title: 'Free Delivery', sub: 'On orders over GH₵ 200' },
            { icon: <RefreshCw size={22} />, title: 'Easy Returns', sub: 'Free 7-day returns' },
            { icon: <ShieldCheck size={22} />, title: 'Secure Checkout', sub: 'SSL encrypted payments' },
            { icon: <Star size={22} />, title: 'Quality Products', sub: 'Verified by our team' },
          ].map(({ icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                {icon}
              </div>
              <div>
                <p className="text-sm font-bold leading-tight" style={{ color: 'var(--color-text)' }}>{title}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATEGORIES (Option C) ────────────────────────────────────────── */}
      <section id="categories" className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold" style={{ color: 'var(--color-text)' }}>Shop Our Top Categories</h2>
        </div>
        {categories.length === 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {['Fashion', 'Electronics', 'Home', 'Beauty', 'Sports', 'Books'].map((name, i) => {
              const c = CAT_COLORS[i % CAT_COLORS.length]
              return (
                <div key={name} className="rounded-2xl overflow-hidden aspect-[3/4] flex flex-col items-center justify-end p-3 cursor-default"
                  style={{ background: c.bg }}>
                  <span className="text-3xl mb-2">🏷️</span>
                  <p className="text-xs font-bold text-white text-center leading-tight">{name}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {categories.slice(0, 6).map((cat, i) => {
              const c = CAT_COLORS[i % CAT_COLORS.length]
              return (
                <Link
                  key={cat.id}
                  href={`/products?categoryId=${cat.id}`}
                  className="group rounded-2xl overflow-hidden aspect-[3/4] flex flex-col items-center justify-between p-4 hover:scale-105 transition-transform duration-200"
                  style={{ background: c.bg }}
                >
                  <div className="w-full flex-1 flex items-center justify-center">
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-contain drop-shadow-lg" />
                    ) : (
                      <span className="text-5xl drop-shadow-md">🛍️</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white text-center leading-tight mt-2">{cat.name}</p>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* ── FEATURED PRODUCTS ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold" style={{ color: 'var(--color-text)' }}>Featured Products</h2>
          <Link href="/products" className="text-sm font-semibold flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {featured.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p className="text-4xl mb-3">🛍️</p>
            <p className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>Products coming soon — check back later!</p>
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
