'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'

const PERIODS = [
  { id: '24h', label: '24h' },
  { id: '7d',  label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: 'all', label: 'All time' },
] as const

export type PeriodId = typeof PERIODS[number]['id']

export default function PeriodSelector({ active = '30d', paramName = 'period' }: { active?: PeriodId; paramName?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const current = (searchParams.get(paramName) as PeriodId | null) ?? active

  function pick(p: PeriodId) {
    if (p === current) return
    const params = new URLSearchParams(searchParams.toString())
    if (p === '30d') params.delete(paramName)
    else params.set(paramName, p)
    const qs = params.toString()
    startTransition(() => {
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    })
  }

  return (
    <div
      className="inline-flex items-center rounded-xl p-1 gap-0.5"
      style={{ background: '#FFFFFF', border: '1.5px solid rgba(226,232,240,0.8)', opacity: pending ? 0.7 : 1 }}
      role="tablist"
      aria-label="Time period"
    >
      {PERIODS.map(p => {
        const isActive = p.id === current
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => pick(p.id)}
            disabled={pending}
            className="cursor-pointer transition-all duration-150 font-semibold rounded-lg disabled:cursor-wait"
            style={{
              fontSize: '12px',
              padding: '6px 12px',
              background: isActive ? '#F97316' : 'transparent',
              color: isActive ? '#FFFFFF' : '#64748B',
              boxShadow: isActive ? '0 1px 2px rgba(249,115,22,0.25)' : 'none',
            }}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}
