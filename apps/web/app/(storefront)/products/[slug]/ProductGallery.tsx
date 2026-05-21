'use client'

import { useState } from 'react'

type Props = { images: string[]; name: string }

export default function ProductGallery({ images, name }: Props) {
  const [activeIdx, setActiveIdx] = useState(0)

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="aspect-square rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface-muted)' }}>
        {images[activeIdx] ? (
          <img src={images[activeIdx]} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl">📦</div>
        )}
      </div>
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className="w-16 h-16 rounded-xl overflow-hidden border-2 transition-all"
              style={{
                borderColor: i === activeIdx ? 'var(--color-primary)' : 'transparent',
                opacity: i === activeIdx ? 1 : 0.6,
              }}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
