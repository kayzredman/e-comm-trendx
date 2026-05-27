'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ShoppingBag, Truck, Tag, Sparkles } from 'lucide-react'

type Slide = {
  badge: string
  titleA: string
  titleB: string // gradient span
  titleC: string
  sub: string
  ctaHref: string
  ctaLabel: string
  ctaSecondaryHref: string
  ctaSecondaryLabel: string
  image: string
}

const SLIDES: Slide[] = [
  {
    badge: '🔥 New Season Drop',
    titleA: 'Trend That ',
    titleB: 'Slays',
    titleC: ', Delivered Fast.',
    sub: 'Shop the freshest fashion, tech & lifestyle picks — curated by Ghana\'s top creators. Free delivery on orders over ₵200.',
    ctaHref: '/products',
    ctaLabel: 'Shop the Trend',
    ctaSecondaryHref: '/deals',
    ctaSecondaryLabel: 'See Deals',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=90',
  },
  {
    badge: '⚡ Tech Picks',
    titleA: 'Latest ',
    titleB: 'Gadgets',
    titleC: ' at Your Fingertips',
    sub: 'Earbuds, smart watches & home tech. Authentic products, best prices, fast delivery.',
    ctaHref: '/categories/electronics-gadgets',
    ctaLabel: 'Shop Electronics',
    ctaSecondaryHref: '/new',
    ctaSecondaryLabel: "What's New",
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=90',
  },
  {
    badge: '👟 Step Up',
    titleA: 'Step Into ',
    titleB: 'Style',
    titleC: ' This Season',
    sub: 'Sneakers, heels, oxfords. Hundreds of styles. Free delivery over ₵200.',
    ctaHref: '/categories/shoes-footwear',
    ctaLabel: 'Shop Shoes',
    ctaSecondaryHref: '/categories/bags-accessories',
    ctaSecondaryLabel: 'View Bags',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=90',
  },
]

export default function HeroV2() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setCurrent((c) => (c + 1) % SLIDES.length), 7000)
    return () => clearInterval(t)
  }, [])

  const slide = SLIDES[current]

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0A0F1E 0%, #0F172A 50%, #1E293B 100%)',
        minHeight: '88vh',
      }}
    >
      {/* Floating orbs */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: '-10%',
          left: '-8%',
          width: 520,
          height: 520,
          background: 'radial-gradient(circle, rgba(37,99,235,0.45) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'orb-drift 14s ease-in-out infinite',
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: '30%',
          right: '-6%',
          width: 460,
          height: 460,
          background: 'radial-gradient(circle, rgba(124,58,237,0.42) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'orb-drift 16s ease-in-out 2s infinite reverse',
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full hidden md:block"
        style={{
          bottom: '-12%',
          left: '38%',
          width: 380,
          height: 380,
          background: 'radial-gradient(circle, rgba(244,63,94,0.32) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'orb-drift 18s ease-in-out 4s infinite',
        }}
      />

      {/* Grid layout */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 grid md:grid-cols-2 gap-10 items-center" style={{ minHeight: '88vh' }}>
        {/* LEFT — copy */}
        <div className="py-14 md:py-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={`hero-copy-${current}`}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.08 } },
                exit: {},
              }}
            >
              {/* badge */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
                  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-6"
                style={{
                  background: 'rgba(37,99,235,0.18)',
                  border: '1px solid rgba(37,99,235,0.35)',
                  color: '#93C5FD',
                  letterSpacing: '0.04em',
                }}
              >
                {slide.badge}
              </motion.div>

              {/* headline */}
              <motion.h1
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
                  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
                }}
                className="font-black mb-6 leading-[1.05]"
                style={{
                  fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)',
                  color: '#F8FAFC',
                  letterSpacing: '-0.025em',
                }}
              >
                {slide.titleA}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #60A5FA 0%, #A78BFA 50%, #F472B6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {slide.titleB}
                </span>
                {slide.titleC}
              </motion.h1>

              {/* sub */}
              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
                  exit: { opacity: 0, y: -6, transition: { duration: 0.2 } },
                }}
                className="text-base md:text-lg mb-8 max-w-xl"
                style={{ color: 'rgba(226,232,240,0.72)', lineHeight: 1.65 }}
              >
                {slide.sub}
              </motion.p>

              {/* CTAs */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
                  exit: { opacity: 0, transition: { duration: 0.2 } },
                }}
                className="flex flex-wrap gap-3 mb-10"
              >
                <Link
                  href={slide.ctaHref}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold text-white transition-transform hover:scale-105 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                    boxShadow: '0 12px 32px rgba(37,99,235,0.45)',
                  }}
                >
                  <ShoppingBag size={16} /> {slide.ctaLabel} <ArrowRight size={16} />
                </Link>
                <Link
                  href={slide.ctaSecondaryHref}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold transition-all hover:bg-white/15 active:scale-95"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    color: '#F1F5F9',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <Tag size={15} /> {slide.ctaSecondaryLabel}
                </Link>
              </motion.div>

              {/* Stats row */}
              <motion.div
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { duration: 0.6 } },
                  exit: { opacity: 0, transition: { duration: 0.2 } },
                }}
                className="flex items-center gap-8"
              >
                {[
                  { val: '50K+', label: 'Happy customers' },
                  { val: '4.9★', label: 'Average rating' },
                  { val: '24h', label: 'Express delivery' },
                ].map((s) => (
                  <div key={s.label}>
                    <div
                      className="font-black text-2xl md:text-3xl mb-1"
                      style={{
                        background: 'linear-gradient(135deg, #60A5FA, #A78BFA)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {s.val}
                    </div>
                    <div className="text-xs uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.7)' }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Dot indicators */}
          <div className="flex items-center gap-2 mt-10">
            {SLIDES.map((s, i) => (
              <button
                key={s.image}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Slide ${i + 1}`}
                className="transition-all rounded-full"
                style={{
                  width: i === current ? 36 : 10,
                  height: 10,
                  background: i === current
                    ? 'linear-gradient(135deg, #60A5FA, #A78BFA)'
                    : 'rgba(255,255,255,0.22)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>

        {/* RIGHT — image + floating cards */}
        <div className="relative h-[460px] md:h-[600px] hidden md:block">
          <AnimatePresence mode="wait">
            <motion.div
              key={`hero-img-${current}`}
              initial={{ opacity: 0, scale: 0.96, rotate: -1.5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute inset-0 rounded-[28px] overflow-hidden"
              style={{
                boxShadow: '0 40px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <Image src={slide.image} alt="" fill unoptimized sizes="50vw" className="object-cover" />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(180deg, rgba(10,15,30,0) 50%, rgba(10,15,30,0.45) 100%)' }}
              />
            </motion.div>
          </AnimatePresence>

          {/* Floating card — top-right (rating) */}
          <motion.div
            initial={{ opacity: 0, x: 30, y: -20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="absolute -top-6 -right-4 rounded-2xl px-5 py-4 flex items-center gap-3"
            style={{
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 48px rgba(0,0,0,0.35)',
              animation: 'float-card 5s ease-in-out infinite',
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}
            >
              <Sparkles size={20} color="#fff" />
            </div>
            <div>
              <div className="font-black text-lg leading-none" style={{ color: '#0F172A' }}>4.9 / 5</div>
              <div className="text-xs font-medium mt-1" style={{ color: '#64748B' }}>12K+ reviews</div>
            </div>
          </motion.div>

          {/* Floating card — bottom-left (delivery) */}
          <motion.div
            initial={{ opacity: 0, x: -30, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="absolute -bottom-4 -left-4 rounded-2xl px-5 py-4 flex items-center gap-3"
            style={{
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 48px rgba(0,0,0,0.35)',
              animation: 'float-card 6s ease-in-out 1.5s infinite',
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #10B981, #06B6D4)' }}
            >
              <Truck size={20} color="#fff" />
            </div>
            <div>
              <div className="font-black text-base leading-none" style={{ color: '#0F172A' }}>Free Delivery</div>
              <div className="text-xs font-medium mt-1" style={{ color: '#64748B' }}>Orders over ₵200</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
