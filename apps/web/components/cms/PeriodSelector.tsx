'use client'

import { useState } from 'react'

const PERIODS = [
  { id: '24h', label: '24h' },
  { id: '7d',  label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: 'all', label: 'All time' },
] as const

type PeriodId = typeof PERIODS[number]['id']

export default function PeriodSelector({ active = '30d' }: { active?: PeriodId }) {
  const [selected, setSelected] = useState<PeriodId>(active)

  return (
    <div
      className="inline-flex items-center rounded-xl p-1 gap-0.5"
      style={{ background: '#FFFFFF', border: '1.5px solid rgba(226,232,240,0.8)' }}
      role="tablist"
      aria-label="Time period"
    >
      {PERIODS.map(p => {
        const isActive = p.id === selected
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setSelected(p.id)}
            disabled={p.id !== '30d'}
            title={p.id !== '30d' ? 'Coming soon' : undefined}
            className="cursor-pointer transition-all duration-150 font-semibold rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
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
