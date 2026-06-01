'use client'

import { useEffect, useState } from 'react'
import { productsApi } from '@/lib/api'
import { publicFeatures } from '@trendmarga/config'

/** Threshold (units) below which we render a "Only N left" badge. */
export const LOW_STOCK_THRESHOLD = 5

export type StockState = 'in' | 'low' | 'out' | 'unknown'

export type StockInfo = {
  state: StockState
  qty: number | null
}

const cache = new Map<string, { ts: number; qty: number }>()
const TTL_MS = 30_000

/** Fetch live inventory for a set of productIds. Cached for 30s in-memory.
 *  Resolves to a Map<productId, qty>. Returns an empty map when the
 *  inventory feature flag is disabled (callers should noop). */
export function useLiveStock(productIds: string[]): Map<string, number> {
  const [map, setMap] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    if (!publicFeatures.inventory) return
    if (productIds.length === 0) {
      setMap(new Map())
      return
    }
    let cancelled = false
    const now = Date.now()
    const stale = productIds.filter((id) => {
      const hit = cache.get(id)
      return !hit || now - hit.ts > TTL_MS
    })

    async function load() {
      await Promise.all(
        stale.map(async (id) => {
          try {
            const p = await productsApi.get(id)
            cache.set(id, { ts: Date.now(), qty: p.inventory ?? 0 })
          } catch {
            /* leave cache entry alone */
          }
        }),
      )
      if (cancelled) return
      const next = new Map<string, number>()
      for (const id of productIds) {
        const hit = cache.get(id)
        if (hit) next.set(id, hit.qty)
      }
      setMap(next)
    }

    if (stale.length > 0) {
      void load()
    } else {
      const next = new Map<string, number>()
      for (const id of productIds) {
        const hit = cache.get(id)
        if (hit) next.set(id, hit.qty)
      }
      setMap(next)
    }
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIds.join(',')])

  return map
}

export function classifyStock(qty: number | null | undefined): StockInfo {
  if (qty == null) return { state: 'unknown', qty: null }
  if (qty <= 0) return { state: 'out', qty }
  if (qty <= LOW_STOCK_THRESHOLD) return { state: 'low', qty }
  return { state: 'in', qty }
}
