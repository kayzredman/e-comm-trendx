import { auth } from '@clerk/nextjs/server'
import { customersApi, type Customer } from '@/lib/api'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:          { label: 'Pending',         bg: '#FEF9C3', color: '#CA8A04' },
  CONFIRMED:        { label: 'Confirmed',        bg: '#DBEAFE', color: '#2563EB' },
  PROCESSING:       { label: 'Processing',       bg: '#EDE9FE', color: '#7C3AED' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', bg: '#FFEDD5', color: '#EA580C' },
  DELIVERED:        { label: 'Delivered',        bg: '#DCFCE7', color: '#16A34A' },
  CANCELLED:        { label: 'Cancelled',        bg: '#F3F4F6', color: '#6B7280' },
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params
  const { getToken } = await auth()
  const token = await getToken()

  if (!token) notFound()

  let customer: Customer | null = null
  try {
    customer = await customersApi.get(id, token)
  } catch { /* not found or API down */ }

  if (!customer) notFound()

  const totalSpend = customer.orders?.reduce((s, o) => s + Number(o.total), 0) ?? 0
  const completedOrders = customer.orders?.filter(o => o.status === 'DELIVERED').length ?? 0

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <Link href="/cms/customers" className="inline-flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
        <ArrowLeft size={16} /> Back to customers
      </Link>

      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>{customer.name}</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Customer since {new Date(customer.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total orders', value: customer.orders?.length ?? 0 },
          { label: 'Delivered', value: completedOrders },
          { label: 'Total spend', value: `GH₵ ${totalSpend.toFixed(2)}` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border p-4 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Contact & address */}
      <div className="rounded-xl border p-5 mb-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Contact</h2>
        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          <div><span style={{ color: 'var(--color-text-muted)' }}>Phone: </span><span style={{ color: 'var(--color-text)' }}>{customer.phone}</span></div>
          {customer.email && <div><span style={{ color: 'var(--color-text-muted)' }}>Email: </span><span style={{ color: 'var(--color-text)' }}>{customer.email}</span></div>}
          <div className="sm:col-span-2">
            <span style={{ color: 'var(--color-text-muted)' }}>Address: </span>
            <span style={{ color: 'var(--color-text)' }}>
              {customer.address.street}, {customer.address.city}, {customer.address.region}, {customer.address.country}
            </span>
          </div>
        </div>
      </div>

      {/* Order history */}
      {(customer.orders?.length ?? 0) > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Order history</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left px-5 py-2.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>Order</th>
                <th className="text-left px-5 py-2.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>Date</th>
                <th className="text-left px-5 py-2.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>Total</th>
                <th className="text-left px-5 py-2.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>Status</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {customer.orders?.map(order => {
                const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.PENDING
                return (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-5 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                      #{order.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-5 py-3 font-semibold" style={{ color: 'var(--color-text)' }}>
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/cms/orders/${order.id}`}
                        className="text-xs font-medium"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        View →
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
