'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { courierApi, courierAuth, type CourierProfile } from '@/lib/courier-api'
import { CourierGate, CourierTabBar } from '../_components'

export default function ProfilePage() {
  return <CourierGate><Inner /></CourierGate>
}

function Inner() {
  const router = useRouter()
  const [me, setMe] = useState<CourierProfile | null>(null)

  useEffect(() => { setMe(courierAuth.getProfile()) }, [])

  async function signOut() {
    try { await courierApi.signOut() } catch {}
    router.replace('/courier')
  }

  const initials = me?.name?.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  return (
    <div className="cr-shell">
      <header className="cr-appbar">
        <Link href="/courier/jobs" className="cr-back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </Link>
        <div><h1>Profile</h1></div>
      </header>

      <div className="cr-body">
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="cr-avatar" style={{ width: 56, height: 56, fontSize: 18 }}>{initials}</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{me?.name ?? '—'}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{me?.phone}</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>{me?.employmentType} · {me?.vehicle ?? 'No vehicle on file'}</div>
          </div>
        </div>

        <Row label="Commission rate" value={`${me?.commissionPct ?? '—'}%`} />
        <Row label="Payout MoMo" value={me?.momoNumber ?? 'Not set'} />

        <div style={{ marginTop: 12 }}>
          <button className="cr-btn cr-danger-outline" onClick={signOut}>Sign out</button>
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 12 }}>trendMarga Courier · v1.0.0</div>
      </div>

      <CourierTabBar active="profile" />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: '#6B7280' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{value}</span>
    </div>
  )
}
