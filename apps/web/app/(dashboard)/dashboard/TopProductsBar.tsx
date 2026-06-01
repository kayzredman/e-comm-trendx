'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'

type Row = {
  productId: string
  productName: string
  totalRevenue: string
  unitsSold: number
}

function truncate(name: string, max = 18) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name
}

function formatGhs(n: number) {
  return `GH₵ ${Math.round(n).toLocaleString('en-GH')}`
}

export default function TopProductsBar({ data, height = 260 }: { data: Row[]; height?: number }) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center" style={{ height, color: 'var(--color-text-muted)' }}>
        <p className="text-sm">No sales data yet</p>
      </div>
    )
  }

  const rows = data.map(d => ({
    name: truncate(d.productName),
    fullName: d.productName,
    revenue: Number(d.totalRevenue) || 0,
    units: Number(d.unitsSold) || 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#64748B' }}
          tickFormatter={v => formatGhs(v as number)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fontSize: 11, fill: '#0F172A', fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(37,99,235,0.06)' }}
          contentStyle={{
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            fontSize: 12,
            padding: '8px 10px',
          }}
          labelStyle={{ fontWeight: 700, color: '#0F172A', marginBottom: 4 }}
          formatter={(value, key) => {
            const n = Number(value) || 0
            if (key === 'revenue') return [formatGhs(n), 'Revenue']
            return [`${n} units`, 'Sold']
          }}
          labelFormatter={(_l, payload) => {
            const item = payload?.[0]?.payload as { fullName?: string } | undefined
            return item?.fullName ?? String(_l ?? '')
          }}
        />
        <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={18}>
          {rows.map((_, i) => (
            <Cell key={i} fill={i === 0 ? '#F97316' : '#2563EB'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
