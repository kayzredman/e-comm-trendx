'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

const SLIDES = [
  {
    id: 1,
    badge: '🔥 Flash Sale — Up to 50% Off',
    headline: 'Dress to\nImpress',
    sub: 'Shop the freshest Ankara & kente styles. Fast delivery across Ghana.',
    cta: { label: 'Shop Fashion', href: '/categories/fashion-clothing' },
    ctaSecondary: { label: 'See Deals', href: '/deals' },
    image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=900&q=85',
    accent: '#E11D48',
    bg: '#FFF1F2',
    overlay: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
  },
  {
    id: 2,
    badge: '✨ New Arrivals 2026',
    headline: 'Top Gadgets\nAt Your Fingertips',
    sub: 'Smart watches, earbuds, speakers and more. Latest tech, best prices.',
    cta: { label: 'Shop Electronics', href: '/categories/electronics-gadgets' },
    ctaSecondary: { label: 'View Phones', href: '/categories/phones-tablets' },
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=85',
    accent: '#2563EB',
    bg: '#EFF6FF',
    overlay: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
  },
  {
    id: 3,
    badge: '👟 Exclusive Styles',
    headline: 'Step Into\nStyle',
    sub: 'Hundreds of shoes — sneakers, heels, oxfords. Free delivery over ₵200.',
    cta: { label: 'Shop Shoes', href: '/categories/shoes-footwear' },
    ctaSecondary: { label: 'View Bags', href: '/categories/bags-accessories' },
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=85',
    accent: '#7C3AED',
    bg: '#F5F3FF',
    overlay: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
  },
  {
    id: 4,
    badge: '🌿 Ghana\'s Finest',
    headline: 'Glow Up\nNaturally',
    sub: 'Pure shea butter, vitamin C serums, and natural beauty from Ghana.',
    cta: { label: 'Shop Beauty', href: '/categories/beauty-skincare' },
    ctaSecondary: { label: 'What\'s New', href: '/new' },
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=900&q=85',
    accent: '#059669',
    bg: '#F0FDF4',
    overlay: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
  },
]

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const goTo = useCallback((idx: number) => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrent(idx)
    setTimeout(() => setIsAnimating(false), 500)
  }, [isAnimating])

  const next = useCallback(() => goTo((current + 1) % SLIDES.length), [current, goTo])
  const prev = useCallback(() => goTo((current - 1 + SLIDES.length) % SLIDES.length), [current, goTo])

  // Auto-advance every 5s
  useEffect(() => {
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [next])

  const slide = SLIDES[current]

  return (
    <section
      className="relative overflow-hidden transition-all duration-500"
      style={{ background: slide.overlay, minHeight: 420 }}
    >
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-16 grid md:grid-cols-2 gap-6 items-center">
        {/* Text side */}
        <div
          key={`text-${current}`}
          className="animate-fade-in-left"
          style={{ animation: 'slideInLeft 0.5s ease forwards' }}
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4"
            style={{ background: slide.accent + '22', color: slide.accent }}
          >
            {slide.badge}
          </div>
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 whitespace-pre-line"
            style={{ color: '#111827' }}
          >
            {slide.headline}
          </h1>
          <p className="text-base md:text-lg mb-8 max-w-sm leading-relaxed" style={{ color: '#6B7280' }}>
            {slide.sub}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={slide.cta.href}
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-2xl text-sm text-white transition-transform hover:scale-105"
              style={{ background: slide.accent }}
            >
              {slide.cta.label} <ArrowRight size={16} />
            </Link>
            <Link
              href={slide.ctaSecondary.href}
              className="inline-flex items-center gap-2 font-semibold px-6 py-3.5 rounded-2xl text-sm transition-transform hover:scale-105 border-2"
              style={{ borderColor: slide.accent, color: slide.accent, background: 'white' }}
            >
              {slide.ctaSecondary.label}
            </Link>
          </div>
        </div>

        {/* Image side */}
        <div className="hidden md:flex items-center justify-center">
          <div
            key={`img-${current}`}
            className="relative w-80 h-80 lg:w-96 lg:h-96 rounded-3xl overflow-hidden shadow-2xl"
            style={{ animation: 'slideInRight 0.5s ease forwards' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.image}
              alt={slide.headline}
              className="w-full h-full object-cover"
            />
            {/* Floating badge */}
            <div className="absolute bottom-4 left-4 bg-white rounded-2xl shadow-lg px-3 py-2 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: slide.accent }}>
                %
              </div>
              <div>
                <p className="text-xs font-bold leading-none" style={{ color: '#111827' }}>Best Price</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>Guaranteed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prev / Next buttons */}
      <button
        type="button"
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center transition-transform hover:scale-110"
        style={{ color: '#374151' }}
        aria-label="Previous"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center transition-transform hover:scale-110"
        style={{ color: '#374151' }}
        aria-label="Next"
      >
        <ChevronRight size={18} />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {SLIDES.map((s, i) => (
          <button
            type="button"
            key={s.id}
            onClick={() => goTo(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === current ? 24 : 8,
              height: 8,
              background: i === current ? slide.accent : '#D1D5DB',
            }}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* CSS animations injected */}
      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </section>
  )
}
