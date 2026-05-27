'use client'

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Brush,
} from 'recharts'

interface RevenueDataPoint {
  date: string
  revenue: string
}

interface Props {
  data: RevenueDataPoint[]
  height?: number
  showBrush?: boolean
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function formatRevenue(value: number) {
  return `GH₵ ${value.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function RevenueChart({ data, height = 240, showBrush = false }: Props) {
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
          height,
          color: 'var(--color-text-muted)',
          fontSize: 14,
        }}
      >
        No revenue data for the last 14 days.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: showBrush ? 0 : 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => `₵${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          cursor={{ stroke: '#2563EB', strokeOpacity: 0.18, strokeWidth: 2 }}
          formatter={(value) => [formatRevenue(Number(value)), 'Revenue']}
          contentStyle={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
            fontSize: 12,
            color: '#0F172A',
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          }}
          labelStyle={{ color: '#64748B', marginBottom: 4, fontFamily: 'inherit' }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="none"
          fill="url(#revenueGradient)"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#2563EB"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 2 }}
        />
        {showBrush && chartData.length > 7 && (
          <Brush
            dataKey="date"
            height={22}
            stroke="#2563EB"
            travellerWidth={8}
            fill="#EFF6FF"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
