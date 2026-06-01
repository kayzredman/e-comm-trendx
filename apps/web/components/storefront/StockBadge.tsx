'use client'

import { AlertTriangle, PackageX } from 'lucide-react'
import { classifyStock } from '@/lib/use-live-stock'

type Props = {
  qty: number | null | undefined
  /** Small inline chip (cart) vs full pill (PDP/card). */
  size?: 'sm' | 'md'
  className?: string
}

/** Renders a low-stock / out-of-stock chip. Returns null when stock is healthy
 *  or unknown (so it's safe to drop into any layout). */
export default function StockBadge({ qty, size = 'sm', className }: Props) {
  const info = classifyStock(qty)
  if (info.state === 'in' || info.state === 'unknown') return null

  const isOut = info.state === 'out'
  const Icon = isOut ? PackageX : AlertTriangle
  const bg = isOut ? '#FEE2E2' : '#FEF3C7'
  const color = isOut ? '#991B1B' : '#92400E'
  const padding = size === 'md' ? '4px 10px' : '2px 8px'
  const fontSize = size === 'md' ? 12 : 11
  const iconSize = size === 'md' ? 12 : 10

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-bold tabular-nums ${className ?? ''}`}
      style={{ background: bg, color, padding, fontSize, lineHeight: 1.2 }}
    >
      <Icon size={iconSize} strokeWidth={2.4} />
      {isOut ? 'Out of stock' : `Only ${info.qty} left`}
    </span>
  )
}
