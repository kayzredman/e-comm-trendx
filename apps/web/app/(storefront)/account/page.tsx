import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { Package, MapPin, ArrowRight } from 'lucide-react'
import { accountApi, type AccountCustomer } from '@/lib/api'

export const dynamic = 'force-dynamic'

export default async function AccountHome() {
  const { getToken } = await auth()
  const token = await getToken()
  let me: AccountCustomer | null = null
  let orderCount = 0
  let addressCount = 0
  try {
    if (token) {
      me = await accountApi.me(token)
      const [orders, addresses] = await Promise.all([
        accountApi.orders(token).catch(() => []),
        accountApi.listAddresses(token).catch(() => []),
      ])
      orderCount = orders.length
      addressCount = addresses.length
    }
  } catch { /* ignore */ }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
          Welcome back{me?.name ? `, ${me.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Manage your profile, track orders and save delivery addresses.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/account/orders"
          className="group rounded-2xl p-5 transition-all hover:-translate-y-0.5"
          style={{ background: '#fff', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#DBEAFE', color: '#2563EB' }}>
                <Package size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>My Orders</p>
                <p className="text-2xl font-bold font-mono tabular-nums" style={{ color: 'var(--color-text)' }}>{orderCount}</p>
              </div>
            </div>
            <ArrowRight size={18} style={{ color: 'var(--color-text-muted)' }} />
          </div>
        </Link>

        <Link
          href="/account/addresses"
          className="group rounded-2xl p-5 transition-all hover:-translate-y-0.5"
          style={{ background: '#fff', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FFEDD5', color: '#F97316' }}>
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Saved Addresses</p>
                <p className="text-2xl font-bold font-mono tabular-nums" style={{ color: 'var(--color-text)' }}>{addressCount}</p>
              </div>
            </div>
            <ArrowRight size={18} style={{ color: 'var(--color-text-muted)' }} />
          </div>
        </Link>
      </div>

      <section className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text)' }}>Profile</h2>
        {me ? (
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Field label="Name" value={me.name} />
            <Field label="Email" value={me.email ?? '—'} />
            <Field label="Phone" value={me.phone} />
            <Field label="Member since" value={new Date(me.createdAt).toLocaleDateString()} />
          </dl>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Account profile not yet set up. Place an order to complete your profile.
          </p>
        )}
      </section>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label}</dt>
      <dd className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text)' }}>{value}</dd>
    </div>
  )
}
