import { productsApi, categoriesApi, type Product, type Category } from '@/lib/api'
import Link from 'next/link'
import Image from 'next/image'

import { ArrowRight, Truck, RotateCcw, Shield, Headphones } from 'lucide-react'
import HeroCarousel from '@/components/storefront/HeroCarousel'
import ProductCard from '@/components/storefront/ProductCard'
import FadeInSection from '@/components/storefront/FadeInSection'

export const dynamic = 'force-dynamic'

const TRUST = [
  { icon: Truck,       label: 'Free Delivery', sub: 'On orders over ₵200' },
  { icon: RotateCcw,   label: 'Easy Returns',   sub: '30-day return policy' },
  { icon: Shield,      label: 'Secure Payment', sub: '100% protected' },
  { icon: Headphones,  label: '24/7 Support',   sub: 'Always here for you' },
]

// ── Category card — image-based like the V2 mockup ──────────────────────────
function CategoryCard({ cat, index }: { cat: Category; index: number }) {
  const fallbackGradients = [
    'linear-gradient(135deg,#667eea,#764ba2)',
    'linear-gradient(135deg,#f093fb,#f5576c)',
    'linear-gradient(135deg,#4facfe,#00f2fe)',
    'linear-gradient(135deg,#43e97b,#38f9d7)',
    'linear-gradient(135deg,#fa709a,#fee140)',
    'linear-gradient(135deg,#a18cd1,#fbc2eb)',
    'linear-gradient(135deg,#ffecd2,#fcb69f)',
    'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
  ]
  return (
    <Link
      href={`/categories/${cat.slug}`}
      className="group relative overflow-hidden rounded-2xl flex flex-col justify-end"
      style={{ aspectRatio: '3/4', background: fallbackGradients[index % fallbackGradients.length] }}
    >
      {cat.imageUrl && (
        <Image
          src={cat.imageUrl}
          alt={cat.name}
          fill
          unoptimized
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
      )}
      {/* overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)' }} />
      {/* content */}
      <div className="relative p-4">
        <p className="font-extrabold text-white text-base leading-snug">{cat.name}</p>
        <p className="text-xs text-white/60 mt-0.5">Explore →</p>
        {/* CTA slides up on hover */}
        <div
          className="mt-3 py-2 px-4 rounded-xl text-xs font-bold text-white text-center transition-all duration-300 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0"
          style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          Shop Now
        </div>
      </div>
    </Link>
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
      <section style={{ background: 'white', borderBottom: '1px solid rgba(226,232,240,0.7)' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {TRUST.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--color-primary-light)' }}
              >
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
          <FadeInSection>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] mb-1.5" style={{ color: 'var(--color-primary)' }}>
                  Browse Collections
                </p>
                <h2 className="text-2xl font-extrabold" style={{ color: 'var(--color-text)' }}>Shop by Category</h2>
              </div>
              <Link href="/products" className="text-sm font-semibold items-center gap-1 hidden sm:inline-flex" style={{ color: 'var(--color-primary)' }}>
                All products <ArrowRight size={14} />
              </Link>
            </div>
          </FadeInSection>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {categories.slice(0, 8).map((cat, i) => (
              <FadeInSection key={cat.id} delay={i * 0.06}>
                <CategoryCard cat={cat} index={i} />
              </FadeInSection>
            ))}
          </div>
        </section>
      )}

      {/* Hot Deals banner */}
      {deals.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-10">
          <FadeInSection>
            <div className="flex items-center justify-between mb-8 pb-5" style={{ borderBottom: '1.5px solid var(--color-border)' }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] mb-1.5 flex items-center gap-2">
                  <span className="inline-block w-5 h-0.5 rounded-full" style={{ background: 'var(--color-primary)' }} />
                  <span style={{ color: 'var(--color-primary)' }}>Today&apos;s Picks</span>
                </p>
                <h2 className="text-2xl md:text-3xl font-extrabold" style={{ color: 'var(--color-text)' }}>Best Deals Right Now</h2>
              </div>
              <Link href="/deals" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold border-b pb-0.5 transition-opacity hover:opacity-50" style={{ color: 'var(--color-text)', borderColor: 'var(--color-text)' }}>
                View all <ArrowRight size={14} />
              </Link>
            </div>
          </FadeInSection>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {deals.map((p, i) => (
              <FadeInSection key={p.id} delay={i * 0.07}>
                <ProductCard product={p} />
              </FadeInSection>
            ))}
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-10">
          <FadeInSection>
            <div className="flex items-center justify-between mb-8 pb-5" style={{ borderBottom: '1.5px solid var(--color-border)' }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] mb-1.5 flex items-center gap-2">
                  <span className="inline-block w-5 h-0.5 rounded-full" style={{ background: 'var(--color-primary)' }} />
                  <span style={{ color: 'var(--color-primary)' }}>Just Dropped</span>
                </p>
                <h2 className="text-2xl md:text-3xl font-extrabold" style={{ color: 'var(--color-text)' }}>New Arrivals</h2>
              </div>
              <Link href="/new" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold border-b pb-0.5 transition-opacity hover:opacity-50" style={{ color: 'var(--color-text)', borderColor: 'var(--color-text)' }}>
                Explore all <ArrowRight size={14} />
              </Link>
            </div>
          </FadeInSection>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {newArrivals.map((p, i) => (
              <FadeInSection key={p.id} delay={i * 0.07}>
                <ProductCard product={p} />
              </FadeInSection>
            ))}
          </div>
        </section>
      )}

      {/* Promo banner */}
      <FadeInSection>
        <section className="max-w-6xl mx-auto px-4 pb-10">
          <div
            className="rounded-3xl overflow-hidden relative flex items-center justify-between px-8 py-10 gap-6"
            style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #0891B2 100%)' }}
          >
            {/* Glow orb */}
            <div className="absolute right-16 top-0 w-72 h-72 rounded-full opacity-20 blur-3xl" style={{ background: '#3B82F6' }} />
            <div className="text-white max-w-sm relative z-10">
              <p className="text-sm font-bold uppercase tracking-widest opacity-60 mb-2">Free Delivery</p>
              <h3 className="text-3xl font-extrabold mb-2">On orders over ₵200</h3>
              <p className="text-sm opacity-70 mb-6">Shop more, save more. All across Ghana.</p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-white font-bold px-6 py-3 rounded-2xl text-sm transition-transform hover:scale-105 active:scale-95"
                style={{ color: '#1E3A8A' }}
              >
                Shop now <ArrowRight size={16} />
              </Link>
            </div>
            <div className="hidden md:block text-8xl opacity-25 select-none relative z-10">🚚</div>
          </div>
        </section>
      </FadeInSection>

      {/* All featured products */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <FadeInSection>
          <div className="flex items-center justify-between mb-8 pb-5" style={{ borderBottom: '1.5px solid var(--color-border)' }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] mb-1.5 flex items-center gap-2">
                <span className="inline-block w-5 h-0.5 rounded-full" style={{ background: 'var(--color-primary)' }} />
                <span style={{ color: 'var(--color-primary)' }}>Curated For You</span>
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold" style={{ color: 'var(--color-text)' }}>Featured Products</h2>
            </div>
            <Link href="/products" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold border-b pb-0.5 transition-opacity hover:opacity-50" style={{ color: 'var(--color-text)', borderColor: 'var(--color-text)' }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>
        </FadeInSection>
        {featured.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>Products coming soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {featured.map((p, i) => (
              <FadeInSection key={p.id} delay={i * 0.05}>
                <ProductCard product={p} />
              </FadeInSection>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
