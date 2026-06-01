import Link from 'next/link'
import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { User, Package, MapPin, LogOut } from 'lucide-react'
import { accountApi } from '@/lib/api'
import { SignOutButton } from '@clerk/nextjs'

export const dynamic = 'force-dynamic'

const navItems = [
  { href: '/account', label: 'Profile', icon: User },
  { href: '/account/orders', label: 'My Orders', icon: Package },
  { href: '/account/addresses', label: 'Saved Addresses', icon: MapPin },
]

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const { userId, getToken } = await auth()
  if (!userId) redirect('/sign-in?redirect_url=/account')
  const user = await currentUser()
  const token = await getToken()

  // Bootstrap account record on first visit so /me returns the customer
  if (token) {
    try {
      const me = await accountApi.me(token)
      if (!me) {
        const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'Customer'
        const email = user?.emailAddresses?.[0]?.emailAddress ?? null
        const phone = user?.phoneNumbers?.[0]?.phoneNumber ?? `clerk:${userId}`
        await accountApi.bootstrap({ name, email, phone }, token)
      }
    } catch { /* swallow; banner will surface inside pages */ }
  }

  return (
    <div className="flex-1 min-h-screen" style={{ background: '#EFF6FF' }}>
      <div className="max-w-450 mx-auto p-4 md:p-6 lg:p-8 grid gap-6 md:grid-cols-[240px_1fr]">
        <aside className="md:sticky md:top-20 self-start rounded-2xl p-4" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Signed in as</p>
            <p className="text-sm font-bold mt-1" style={{ color: 'var(--color-text)' }}>
              {user?.firstName ?? 'Customer'} {user?.lastName ?? ''}
            </p>
            {user?.emailAddresses?.[0]?.emailAddress && (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{user.emailAddresses[0].emailAddress}</p>
            )}
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-50"
                style={{ color: 'var(--color-text)' }}
              >
                <item.icon size={16} /> {item.label}
              </Link>
            ))}
            <SignOutButton redirectUrl="/">
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-50 text-left"
                style={{ color: '#DC2626' }}
              >
                <LogOut size={16} /> Sign out
              </button>
            </SignOutButton>
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
