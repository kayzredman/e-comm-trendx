'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
  data: Partial<Record<string, number>>
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING:          { label: 'Pending',          color: '#EAB308' },
  CONFIRMED:        { label: 'Confirmed',         color: '#3B82F6' },
  PROCESSING:       { label: 'Processing',        color: '#8B5CF6' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery',  color: '#F97316' },
  DELIVERED:        { label: 'Delivered',         color: '#22C55E' },
  CANCELLED:        { label: 'Cancelled',         color: '#9CA3AF' },
}

export default function OrdersDonut({ data }: Props) {
  const chartData = Object.entries(data)
    .filter(([, v]) => v && v > 0)
    .map(([key, value]) => ({
      name: STATUS_META[key]?.label ?? key,
      value: value ?? 0,
      color: STATUS_META[key]?.color ?? '#6B7280',
    }))
    .sort((a, b) => b.value - a.value)

  if (chartData.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--color-text-muted)', fontSize: 14 }}>
        No order data yet
      </div>
    )
  }

  const total = chartData.reduce((s, d) => s + d.value, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value} (${Math.round((value / total) * 100)}%)`, name
            ]}
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 13,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
        {chartData.map(d => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--color-text-muted)' }}>{d.name}</span>
            <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
