'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, X, Eye } from 'lucide-react'
import type { Order } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:          { label: 'Pending',          bg: '#FEF9C3', color: '#CA8A04' },
  CONFIRMED:        { label: 'Confirmed',        bg: '#DBEAFE', color: '#2563EB' },
  PROCESSING:       { label: 'Processing',       bg: '#EDE9FE', color: '#7C3AED' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', bg: '#FFEDD5', color: '#EA580C' },
  DELIVERED:        { label: 'Delivered',        bg: '#DCFCE7', color: '#16A34A' },
  CANCELLED:        { label: 'Cancelled',        bg: '#F3F4F6', color: '#6B7280' },
}

type Props = { orders: Order[] }

export default function OrdersTable({ orders }: Props) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      if (status && o.status !== status) return false
      if (q) {
        const hay = `${o.id} ${o.customer?.name ?? ''} ${o.customer?.phone ?? ''} ${o.customer?.email ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [orders, search, status])

  return (
    <>
      <div className="flex gap-2 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-subtle)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID, customer name, phone…"
            className="w-full rounded-lg border pl-9 pr-9 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-subtle)' }}>
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_STYLE).map(([k, s]) => (
            <option key={k} value={k}>{s.label}</option>
          ))}
        </select>
        <span className="text-xs self-center" style={{ color: 'var(--color-text-muted)' }}>
          {filtered.length} of {orders.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>No orders match these filters</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-x-auto" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-muted)' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Order</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Customer</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" style={{ color: 'var(--color-text-muted)' }}>Items</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Total</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.PENDING
                return (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                        #{order.id.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                        {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>{order.customer?.name ?? '—'}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{order.customer?.phone}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell" style={{ color: 'var(--color-text-muted)' }}>
                      {order.items?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-text)' }}>
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/cms/orders/${order.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      >
                        <Eye size={13} /> View
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
