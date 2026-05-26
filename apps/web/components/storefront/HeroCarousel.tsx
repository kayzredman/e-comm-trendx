'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const SLIDES = [
  {
    id: 1,
    badge: 'New Season',
    headline: 'Dress to\nImpress',
    sub: 'Shop the freshest Ankara & kente styles. Fast delivery across Ghana.',
    cta: { label: 'Shop Fashion', href: '/categories/fashion-clothing' },
    ctaSecondary: { label: 'See Deals', href: '/deals' },
    image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1400&q=90',
    accent: '#E11D48',
  },
  {
    id: 2,
    badge: 'Latest Tech',
    headline: 'Top Gadgets\nAt Your Fingertips',
    sub: 'Smart watches, earbuds, speakers and more. Latest tech, best prices.',
    cta: { label: 'Shop Electronics', href: '/categories/electronics-gadgets' },
    ctaSecondary: { label: 'View Phones', href: '/categories/phones-tablets' },
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1400&q=90',
    accent: '#3B82F6',
  },
  {
    id: 3,
    badge: 'Exclusive Styles',
    headline: 'Step Into\nStyle',
    sub: 'Hundreds of shoes — sneakers, heels, oxfords. Free delivery over ₵200.',
    cta: { label: 'Shop Shoes', href: '/categories/shoes-footwear' },
    ctaSecondary: { label: 'View Bags', href: '/categories/bags-accessories' },
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1400&q=90',
    accent: '#8B5CF6',
  },
  {
    id: 4,
    badge: 'Natural Beauty',
    headline: 'Glow Up\nNaturally',
    sub: 'Pure shea butter, vitamin C serums, and natural beauty from Ghana.',
    cta: { label: 'Shop Beauty', href: '/categories/beauty-skincare' },
    ctaSecondary: { label: "What's New", href: '/new' },
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1400&q=90',
    accent: '#10B981',
  },
  {
    id: 5,
    badge: 'Home & Living',
    headline: 'Transform\nYour Space',
    sub: 'Modern furniture, décor & kitchen essentials. Make every room yours.',
    cta: { label: 'Shop Home', href: '/categories/home-living' },
    ctaSecondary: { label: 'View Kitchen', href: '/categories/kitchen' },
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1400&q=90',
    accent: '#F59E0B',
  },
  {
    id: 6,
    badge: 'Sports & Fitness',
    headline: 'Train Hard,\nLive Better',
    sub: 'Gym gear, activewear & sports equipment. Level up your fitness game.',
    cta: { label: 'Shop Sports', href: '/categories/sports-fitness' },
    ctaSecondary: { label: 'See Deals', href: '/deals' },
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1400&q=90',
    accent: '#EF4444',
  },
  {
    id: 7,
    badge: "Kids' World",
    headline: "Fun For\nEvery Child",
    sub: 'Toys, books, clothing & more for the little ones. Safe, quality picks.',
    cta: { label: "Shop Kids'", href: '/categories/kids-babies' },
    ctaSecondary: { label: 'Top Toys', href: '/categories/toys-games' },
    image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=1400&q=90',
    accent: '#F97316',
  },
]

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const goTo = useCallback((idx: number) => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrent(idx)
    setTimeout(() => setIsAnimating(false), 600)
  }, [isAnimating])

  const next = useCallback(() => goTo((current + 1) % SLIDES.length), [current, goTo])
  const prev = useCallback(() => goTo((current - 1 + SLIDES.length) % SLIDES.length), [current, goTo])

  // Auto-advance every 6s
  useEffect(() => {
    const timer = setInterval(next, 6000)
    return () => clearInterval(timer)
  }, [next])

  const slide = SLIDES[current]

  const contentVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
    exit: {},
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
    exit: { opacity: 0, y: -12, transition: { duration: 0.3 } },
  }

  return (
    <section className="relative overflow-hidden" style={{ minHeight: '90vh' }}>
      {/* Background image */}
      <AnimatePresence>
        <motion.img
          key={`bg-${current}`}
          src={slide.image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1.0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </AnimatePresence>

      {/* Cinematic overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(105deg, rgba(6,6,6,0.84) 0%, rgba(6,6,6,0.55) 50%, rgba(6,6,6,0.16) 100%)' }}
      />

      {/* Floating accent orb */}
      <div
        className="absolute right-20 top-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none hidden lg:block"
        style={{ background: slide.accent, animation: 'orb-drift 12s ease-in-out infinite' }}
      />

      {/* Content */}
      <div
        className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 flex items-center"
        style={{ minHeight: '90vh' }}
      >
        <div className="flex-1 max-w-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${current}`}
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Badge */}
              <motion.div variants={itemVariants}>
                <span
                  className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-[0.18em] mb-6"
                  style={{ background: slide.accent, color: 'white' }}
                >
                  {slide.badge}
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={itemVariants}
                className="text-5xl md:text-6xl lg:text-7xl font-black leading-none mb-5 whitespace-pre-line"
                style={{ color: 'white', textShadow: '0 4px 24px rgba(0,0,0,0.25)' }}
              >
                {slide.headline}
              </motion.h1>

              {/* Sub */}
              <motion.p
                variants={itemVariants}
                className="text-base md:text-lg leading-relaxed mb-9 max-w-sm"
                style={{ color: 'rgba(255,255,255,0.72)' }}
              >
                {slide.sub}
              </motion.p>

              {/* CTAs */}
              <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
                <Link
                  href={slide.cta.href}
                  className="inline-flex items-center font-bold px-8 py-3.5 rounded-full text-sm text-white transition-all hover:scale-105 hover:shadow-xl active:scale-95"
                  style={{ background: slide.accent }}
                >
                  {slide.cta.label}
                </Link>
                <Link
                  href={slide.ctaSecondary.href}
                  className="inline-flex items-center font-semibold px-8 py-3.5 rounded-full text-sm text-white transition-all hover:scale-105 active:scale-95 glass"
                >
                  {slide.ctaSecondary.label}
                </Link>
              </motion.div>

              {/* Stats row */}
              <motion.div variants={itemVariants} className="flex gap-6 mt-10">
                {[
                  { val: '10k+', label: 'Products' },
                  { val: 'Free', label: 'Delivery' },
                  { val: '24/7', label: 'Support' },
                ].map(({ val, label }) => (
                  <div key={label} className="text-white">
                    <div className="text-2xl font-black" style={{ textShadow: '0 2px 8px rgba(0,0,0,.3)' }}>{val}</div>
                    <div className="text-xs font-medium opacity-60 mt-0.5">{label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Scroll hint */}
      <div
        className="absolute bottom-7 left-10 flex-col items-center gap-1 hidden md:flex"
        style={{ color: 'rgba(255,255,255,0.50)', animation: 'scrollBounce 2s ease-in-out infinite' }}
      >
        <span className="text-xs font-semibold tracking-[0.14em] uppercase">Scroll</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>

      {/* Slide counter */}
      <div
        className="absolute bottom-8 right-6 md:right-10 text-xs font-bold tracking-widest hidden md:block"
        style={{ color: 'rgba(255,255,255,0.45)' }}
      >
        {String(current + 1).padStart(2, '0')}&thinsp;/&thinsp;{String(SLIDES.length).padStart(2, '0')}
      </div>

      {/* Prev / Next */}
      <button
        type="button"
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 glass"
        style={{ color: 'white' }}
        aria-label="Previous"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 glass"
        style={{ color: 'white' }}
        aria-label="Next"
      >
        <ChevronRight size={20} />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 items-center">
        {SLIDES.map((s, i) => (
          <button
            type="button"
            key={s.id}
            onClick={() => goTo(i)}
            className="rounded-full transition-all duration-400"
            style={{
              width: i === current ? 28 : 8,
              height: 4,
              background: i === current ? 'white' : 'rgba(255,255,255,0.35)',
            }}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      <style>{`
        @keyframes scrollBounce {
          0%, 100% { transform: translateY(0); opacity: 0.55; }
          50%       { transform: translateY(6px); opacity: 0.9; }
        }
      `}</style>
    </section>
  )
}
