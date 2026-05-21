'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface RevenueDataPoint {
  date: string
  revenue: string
}

interface Props {
  data: RevenueDataPoint[]
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function formatRevenue(value: number) {
  return `GH₵ ${value.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function RevenueChart({ data }: Props) {
  const chartData = data.map(d => ({
    date: formatDate(d.date),
    revenue: parseFloat(d.revenue),
  }))

  if (chartData.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 220,
          color: 'var(--color-text-muted)',
          fontSize: 14,
        }}
      >
        No revenue data for the last 14 days.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => `₵${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          formatter={(value: number) => [formatRevenue(value), 'Revenue']}
          contentStyle={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--color-text)',
          }}
          labelStyle={{ color: 'var(--color-text-muted)', marginBottom: 4 }}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="var(--color-primary)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: 'var(--color-primary)' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
