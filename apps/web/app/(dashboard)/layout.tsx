import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import Sidebar from '@/components/cms/Sidebar'
import { usersApi, type UserRole } from '@/lib/api'

export const metadata: Metadata = {
  title: 'TrendMarga Dashboard',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let role: UserRole = 'VIEWER'
  try {
    const { getToken } = await auth()
    const token = await getToken()
    if (token) {
      // JIT sync — registers the user if first login
      const user = await usersApi.sync(token)
      role = user.role
    }
  } catch {}

  return (
    <div className="flex h-full min-h-screen" style={{ background: 'var(--color-page)' }}>
      <Sidebar role={role} />
      {/* Main content — offset for mobile header bar */}
      <main className="flex-1 flex flex-col min-h-screen pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}

