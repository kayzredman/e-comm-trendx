'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Flame, Clock, ArrowRight } from 'lucide-react'
import type { Product } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

function useCountdown(endsInSeconds: number) {
  const [s, setS] = useState(endsInSeconds)
  useEffect(() => {
    const t = setInterval(() => setS((v) => (v <= 0 ? endsInSeconds : v - 1)), 1000)
    return () => clearInterval(t)
  }, [endsInSeconds])
  const hh = String(Math.floor(s / 3600)).padStart(2, '0')
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return { hh, mm, ss }
}

function DealCard({ product, endsIn }: { product: Product; endsIn: number }) {
  const { hh, mm, ss } = useCountdown(endsIn)
  const hasDiscount = product.comparePrice && Number(product.comparePrice) > Number(product.price)
  const pct = hasDiscount
    ? Math.round(((Number(product.comparePrice) - Number(product.price)) / Number(product.comparePrice)) * 100)
    : 0

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className="rounded-2xl overflow-hidden grid grid-cols-[160px_1fr]"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <Link href={`/products/${product.slug}`} className="relative aspect-square bg-slate-900">
        {product.images?.[0] ? (
          <Image src={product.images[0]} alt={product.name} fill unoptimized className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
        )}
      </Link>
      <div className="p-5 flex flex-col">
        {product.category && (
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5" style={{ color: '#93C5FD' }}>
            {product.category.name}
          </p>
        )}
        <Link
          href={`/products/${product.slug}`}
          className="font-bold text-base line-clamp-2 leading-snug mb-2"
          style={{ color: '#F1F5F9' }}
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-2.5 mb-3">
          <span className="font-black text-2xl" style={{ color: '#F8FAFC' }}>
            {formatPrice(product.price)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-sm line-through" style={{ color: 'rgba(148,163,184,0.6)' }}>
                {formatPrice(product.comparePrice ?? 0)}
              </span>
              <span
                className="text-[10px] font-extrabold px-2 py-1 rounded-md"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
                  color: '#fff',
                }}
              >
                {pct}% OFF
              </span>
            </>
          )}
        </div>
        <div
          className="mt-auto flex items-center gap-2 text-xs font-semibold"
          style={{ color: 'rgba(226,232,240,0.78)' }}
        >
          <Clock size={13} style={{ color: '#F59E0B' }} />
          Ends in:
          <span
            className="font-black tabular-nums px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(245,158,11,0.18)', color: '#FBBF24' }}
          >
            {hh}
          </span>
          :
          <span
            className="font-black tabular-nums px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(245,158,11,0.18)', color: '#FBBF24' }}
          >
            {mm}
          </span>
          :
          <span
            className="font-black tabular-nums px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(245,158,11,0.18)', color: '#FBBF24' }}
          >
            {ss}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export default function DealsSection({ deals }: { deals: Product[] }) {
  if (deals.length === 0) return null
  const items = deals.slice(0, 2)
  const endsList = [3600 * 2 + 45 * 60 + 18, 3600 * 4 + 12 * 60 + 55]

  return (
    <section
      className="relative overflow-hidden py-16 my-8"
      style={{
        background: 'linear-gradient(135deg, #0A0F1E 0%, #0F172A 100%)',
      }}
    >
      {/* radial glow */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: '-20%',
          left: '20%',
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(244,63,94,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          bottom: '-25%',
          right: '15%',
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-3"
              style={{
                background: 'rgba(245,158,11,0.15)',
                border: '1px solid rgba(245,158,11,0.35)',
                color: '#FBBF24',
                letterSpacing: '0.06em',
              }}
            >
              <Flame size={13} /> HOT DEALS
            </div>
            <h2 className="font-black text-3xl md:text-4xl" style={{ color: '#F8FAFC' }}>
              Limited Time Offers 🔥
            </h2>
            <p className="text-sm mt-2" style={{ color: 'rgba(148,163,184,0.78)' }}>
              Grab them before they&apos;re gone.
            </p>
          </div>
          <Link
            href="/deals"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
            style={{ color: '#93C5FD' }}
          >
            See all deals <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {items.map((p, i) => (
            <DealCard key={p.id} product={p} endsIn={endsList[i % endsList.length]} />
          ))}
        </div>
      </div>
    </section>
  )
}
