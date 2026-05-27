'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

type Props = {
  status: string
  intervalMs?: number
}

const TERMINAL_STATUSES = new Set(['DELIVERED', 'CANCELLED'])

/**
 * Polls the order tracking page so customers see status updates
 * without refreshing. Stops once the order is delivered or cancelled.
 */
export default function OrderStatusPoller({ status, intervalMs = 30000 }: Props) {
  const router = useRouter()
  const [tick, setTick] = useState(0)
  const isTerminal = TERMINAL_STATUSES.has(status)

  useEffect(() => {
    if (isTerminal) return
    const id = setInterval(() => {
      router.refresh()
      setTick((t) => t + 1)
    }, intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs, isTerminal])

  if (isTerminal) return null

  return (
    <p
      className="text-center text-xs flex items-center justify-center gap-1.5 mt-3"
      style={{ color: 'var(--color-text-subtle)' }}
      aria-live="polite"
    >
      <RefreshCw size={11} className="animate-spin-slow" style={{ animation: 'spin 4s linear infinite' }} />
      Auto-updating every {intervalMs / 1000}s
      {tick > 0 && <span className="opacity-60">· refreshed {tick}×</span>}
    </p>
  )
}
