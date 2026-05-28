'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Product } from '@/lib/api'

type GalleryImage = {
  detail: string
  thumb: string
  alt: string
  blurDataUrl?: string
}

function buildList(product: Pick<Product, 'images' | 'imageAssets' | 'name'>): GalleryImage[] {
  const assets = (product.imageAssets ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder)
  if (assets.length > 0) {
    const out: GalleryImage[] = []
    for (const a of assets) {
      const detail = a.urls.detail ?? a.urls.grid ?? a.url
      const thumb = a.urls.thumb ?? a.urls.grid ?? detail
      if (!detail || !thumb) continue
      out.push({
        detail,
        thumb,
        alt: a.alt ?? product.name,
        blurDataUrl: a.blurDataUrl ?? undefined,
      })
    }
    return out
  }
  return (product.images ?? []).map((url) => ({ detail: url, thumb: url, alt: product.name }))
}

export default function ProductGallery({
  product,
}: {
  product: Pick<Product, 'images' | 'imageAssets' | 'name'>
}) {
  const images = buildList(product)
  const [activeIdx, setActiveIdx] = useState(0)
  const active = images[activeIdx]

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div
        className="relative aspect-square rounded-2xl overflow-hidden"
        style={{ background: 'var(--color-surface-muted)' }}
      >
        {active ? (
          <Image
            key={active.detail}
            src={active.detail}
            alt={active.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            placeholder={active.blurDataUrl ? 'blur' : 'empty'}
            blurDataURL={active.blurDataUrl}
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl">📦</div>
        )}
      </div>
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <button
              key={img.thumb + i}
              onClick={() => setActiveIdx(i)}
              className="relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all"
              style={{
                borderColor: i === activeIdx ? 'var(--color-primary)' : 'transparent',
                opacity: i === activeIdx ? 1 : 0.6,
              }}
              aria-label={`Image ${i + 1}`}
            >
              <Image src={img.thumb} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
