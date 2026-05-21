import type { Metadata } from 'next'
import Sidebar from '@/components/cms/Sidebar'

export const metadata: Metadata = {
  title: 'TrendMarga Dashboard',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full min-h-screen" style={{ background: 'var(--color-page)' }}>
      <Sidebar />
      {/* Main content — offset for mobile header bar */}
      <main className="flex-1 flex flex-col min-h-screen pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
