'use client'

import { useEffect, useState } from 'react'
import { Tag, X } from 'lucide-react'
import { discountsApi, type DiscountCode } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

const DISMISS_KEY = 'tm.promoStrip.dismissed'
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function autoLabel(c: DiscountCode): string {
  const off = c.type === 'PERCENT'
    ? `${Number(c.value)}% off`
    : `${formatPrice(c.value)} off`
  const min = Number(c.minSubtotal)
  return min > 0
    ? `${off} on orders over ${formatPrice(min)}`
    : off
}

export default function PromoStrip() {
  const [promos, setPromos] = useState<DiscountCode[]>([])
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid SSR flash

  useEffect(() => {
    // Hydrate dismiss state
    try {
      const raw = localStorage.getItem(DISMISS_KEY)
      if (raw) {
        const ts = Number(raw)
        if (Number.isFinite(ts) && Date.now() - ts < DISMISS_TTL_MS) {
          return
        }
      }
    } catch {}
    setDismissed(false)
    discountsApi.listPromoted().then(setPromos).catch(() => {})
  }, [])

  if (dismissed || promos.length === 0) return null
  const first = promos[0]

  return (
    <div
      role="region"
      aria-label="Promotion"
      style={{
        background: 'linear-gradient(90deg, #1E40AF 0%, #2563EB 100%)',
        color: '#fff',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3 text-sm">
        <Tag size={14} className="shrink-0 opacity-90" />
        <p className="flex-1 truncate">
          <span className="font-semibold">{first.promoLabel || autoLabel(first)}</span>{' '}
          <span className="opacity-90">— use code </span>
          <span className="font-mono font-bold tracking-wider">{first.code}</span>
          <span className="opacity-90"> at checkout</span>
        </p>
        <button
          onClick={() => {
            try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
            setDismissed(true)
          }}
          aria-label="Dismiss promotion"
          className="p-1 rounded hover:bg-white/10 transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
