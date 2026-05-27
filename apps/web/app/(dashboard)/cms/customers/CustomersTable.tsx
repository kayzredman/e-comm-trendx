'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, X, Eye } from 'lucide-react'
import type { Customer } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

type Props = { customers: Customer[] }

export default function CustomersTable({ customers }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => {
      const hay = `${c.name ?? ''} ${c.phone ?? ''} ${c.email ?? ''} ${c.address?.city ?? ''} ${c.address?.region ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [customers, search])

  return (
    <>
      <div className="flex gap-2 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-subtle)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email, city…"
            className="w-full rounded-lg border pl-9 pr-9 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-subtle)' }}>
              <X size={14} />
            </button>
          )}
        </div>
        <span className="text-xs self-center" style={{ color: 'var(--color-text-muted)' }}>
          {filtered.length} of {customers.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>No customers match this search</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-x-auto" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-muted)' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Name</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Phone</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell" style={{ color: 'var(--color-text-muted)' }}>Location</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Orders</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" style={{ color: 'var(--color-text-muted)' }}>Total spend</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => {
                const totalSpend = customer.orders?.reduce((s, o) => s + Number(o.total), 0) ?? 0
                return (
                  <tr key={customer.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>{customer.name}</p>
                      {customer.email && (
                        <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>{customer.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {customer.phone}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--color-text-muted)' }}>
                      {customer.address?.city}, {customer.address?.region}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                      {customer.orders?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 font-semibold hidden sm:table-cell" style={{ color: 'var(--color-text)' }}>
                      {formatPrice(totalSpend)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/cms/customers/${customer.id}`}
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
