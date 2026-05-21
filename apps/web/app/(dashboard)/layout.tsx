import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TrendMarga Dashboard',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <div className="flex h-full">
        {/* Sidebar placeholder — will be built in Sprint 3 */}
        <aside
          className="hidden md:flex flex-col w-64 min-h-screen border-r"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <span className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>
              TrendMarga
            </span>
            <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>
              CMS
            </span>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-h-screen">
          {children}
        </div>
      </div>
    </ClerkProvider>
  )
}
