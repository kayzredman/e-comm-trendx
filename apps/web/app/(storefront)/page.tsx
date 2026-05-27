import { productsApi, categoriesApi, type Product, type Category } from '@/lib/api'
import Link from 'next/link'
import Image from 'next/image'

import { ArrowRight, Truck, RotateCcw, Shield, Headphones } from 'lucide-react'
import HeroV2 from '@/components/storefront/HeroV2'
import ProductCard from '@/components/storefront/ProductCard'
import FadeInSection from '@/components/storefront/FadeInSection'
import DealsSection from '@/components/storefront/DealsSection'
import NewArrivalsScroll from '@/components/storefront/NewArrivalsScroll'
import PromoBannerV2 from '@/components/storefront/PromoBannerV2'

export const dynamic = 'force-dynamic'

const TRUST = [
  { icon: Truck,      label: 'Free Delivery', sub: 'On orders over ₵200', bg: '#DBEAFE', color: '#2563EB' },
  { icon: RotateCcw,  label: 'Easy Returns',   sub: '30-day return policy', bg: '#D1FAE5', color: '#10B981' },
  { icon: Shield,     label: 'Secure Payment', sub: '100% protected',       bg: '#EDE9FE', color: '#7C3AED' },
  { icon: Headphones, label: '24/7 Support',   sub: 'Always here for you',  bg: '#FEF3C7', color: '#F59E0B' },
]

function CategoryCard({ cat, index, large }: { cat: Category; index: number; large?: boolean }) {
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
      className="group relative overflow-hidden rounded-2xl flex flex-col justify-end h-full w-full"
      style={{
        minHeight: large ? 360 : 280,
        background: fallbackGradients[index % fallbackGradients.length],
      }}
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
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)' }}
      />
      <div className="relative p-4 md:p-5">
        <p className={`font-extrabold text-white leading-snug ${large ? 'text-xl md:text-2xl' : 'text-base'}`}>
          {cat.name}
        </p>
        <p className="text-xs text-white/60 mt-0.5">Explore →</p>
        <div
          className="mt-3 py-2 px-4 rounded-xl text-xs font-bold text-white text-center transition-all duration-300 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 inline-block"
          style={{
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        >
          Shop Now →
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
  const newArrivals = products.slice(0, 8)

  return (
    <div style={{ background: 'var(--color-page)' }}>
      <HeroV2 />

      <section style={{ background: 'white', borderBottom: '1px solid rgba(226,232,240,0.7)' }}>
        <div className="max-w-6xl mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {TRUST.map(({ icon: Icon, label, sub, bg, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <p className="text-sm font-extrabold leading-none" style={{ color: 'var(--color-text)' }}>{label}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <FadeInSection>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] mb-1.5" style={{ color: 'var(--color-primary)' }}>
                  Browse Collections
                </p>
                <h2 className="text-2xl md:text-3xl font-extrabold" style={{ color: 'var(--color-text)' }}>
                  Shop by Category
                </h2>
              </div>
              <Link href="/products" className="text-sm font-semibold items-center gap-1 hidden sm:inline-flex" style={{ color: 'var(--color-primary)' }}>
                All products <ArrowRight size={14} />
              </Link>
            </div>
          </FadeInSection>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-fr">
            {categories.slice(0, 7).map((cat, i) => (
              <div key={cat.id} className={i === 0 ? 'col-span-2 row-span-2' : ''}>
                <FadeInSection delay={i * 0.06}>
                  <CategoryCard cat={cat} index={i} large={i === 0} />
                </FadeInSection>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-6xl mx-auto px-4 pb-10">
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

      <DealsSection deals={deals} />

      <NewArrivalsScroll products={newArrivals} />

      <PromoBannerV2 />
    </div>
  )
}
