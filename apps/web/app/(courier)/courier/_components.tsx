'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { courierAuth } from '@/lib/courier-api'

/** Client-side gate. Redirects to /courier login if no token. */
export function CourierGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!courierAuth.getToken()) {
      router.replace(`/courier?next=${encodeURIComponent(pathname ?? '/courier/jobs')}`)
    }
  }, [router, pathname])

  return <>{children}</>
}

export function CourierTabBar({ active }: { active: 'jobs' | 'history' | 'earnings' | 'profile' }) {
  return (
    <nav className="cr-tabbar">
      <a href="/courier/jobs" className={`cr-tab ${active === 'jobs' ? 'cr-tab-active' : ''}`}>
        <svg viewBox="0 0 24 24"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>
        Jobs
      </a>
      <a href="/courier/history" className={`cr-tab ${active === 'history' ? 'cr-tab-active' : ''}`}>
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        History
      </a>
      <a href="/courier/earnings" className={`cr-tab ${active === 'earnings' ? 'cr-tab-active' : ''}`}>
        <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H7"/></svg>
        Earnings
      </a>
      <a href="/courier/profile" className={`cr-tab ${active === 'profile' ? 'cr-tab-active' : ''}`}>
        <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
        Profile
      </a>
    </nav>
  )
}
