'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import type { Product } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

export default function NewArrivalsScroll({ products }: { products: Product[] }) {
  if (products.length === 0) return null

  return (
    <section className="py-12">
      <div className="max-w-6xl mx-auto px-4 mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] mb-1.5" style={{ color: 'var(--color-primary)' }}>
            Just Dropped
          </p>
          <h2 className="font-extrabold text-2xl md:text-3xl" style={{ color: 'var(--color-text)' }}>
            New Arrivals ✨
          </h2>
        </div>
        <Link
          href="/new"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full transition-colors hover:bg-slate-100"
          style={{ color: 'var(--color-text)' }}
        >
          See All New <ArrowRight size={14} />
        </Link>
      </div>

      <div
        className="overflow-x-auto pb-3 scroll-smooth"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex gap-4 px-4 max-w-6xl mx-auto">
          {products.map((p) => (
            <Link
              href={`/products/${p.slug}`}
              key={p.id}
              className="shrink-0 w-[200px] group"
              style={{ scrollSnapAlign: 'start' }}
            >
              <div
                className="relative w-full aspect-square rounded-2xl overflow-hidden mb-3"
                style={{ background: 'var(--color-surface-muted)' }}
              >
                {p.images?.[0] ? (
                  <Image
                    src={p.images[0]}
                    alt={p.name}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                )}
              </div>
              <p
                className="font-semibold text-sm line-clamp-2 leading-snug mb-1"
                style={{ color: 'var(--color-text)' }}
              >
                {p.name}
              </p>
              <p className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>
                {formatPrice(p.price)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
