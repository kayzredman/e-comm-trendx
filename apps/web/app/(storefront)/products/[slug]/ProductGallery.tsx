'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ZoomIn } from 'lucide-react'
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
    <div className="lg:sticky lg:top-24">
      <div
        className="relative aspect-square rounded-[28px] overflow-hidden mb-3 group"
        style={{ background: 'var(--color-surface)', border: '1.5px solid #F1F5F9' }}
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
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl">📦</div>
        )}

        {active && (
          <div
            className="absolute bottom-3.5 right-3.5 flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-white backdrop-blur-md"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            <ZoomIn size={12} />
            Hover to zoom
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <button
              key={img.thumb + i}
              onClick={() => setActiveIdx(i)}
              className="relative w-[72px] h-[72px] rounded-[10px] overflow-hidden transition-all"
              style={{
                border: '2px solid',
                borderColor: i === activeIdx ? 'var(--color-primary)' : 'transparent',
                background: 'var(--color-surface-muted)',
              }}
              aria-label={`Image ${i + 1}`}
            >
              <Image src={img.thumb} alt="" fill sizes="72px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
