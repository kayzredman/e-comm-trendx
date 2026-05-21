import { auth } from '@clerk/nextjs/server'
import { customersApi, type Customer } from '@/lib/api'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const { getToken } = await auth()
  const token = await getToken()

  let customers: Customer[] = []
  try {
    if (token) customers = await customersApi.list(token)
  } catch { /* API not running */ }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Customers</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {customers.length} customer{customers.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-20 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>No customers yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-subtle)' }}>Customers are created automatically when orders are placed</p>
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
              {customers.map(customer => {
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
    </div>
  )
}
