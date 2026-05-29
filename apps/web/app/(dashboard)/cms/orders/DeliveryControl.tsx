'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  couriersApi,
  assignmentsApi,
  deliveryEventsApi,
  type Courier,
  type DeliveryAssignment,
  type DeliveryEvent,
} from '@/lib/api'
import { Truck, Bike, Loader2, UserPlus, Check, AlertTriangle, RefreshCw } from 'lucide-react'

export default function DeliveryControl({ orderId, deliveryCode }: { orderId: string; deliveryCode: string | null }) {
  const { getToken } = useAuth()
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [active, setActive] = useState<DeliveryAssignment | null>(null)
  const [events, setEvents] = useState<DeliveryEvent[]>([])
  const [pick, setPick] = useState<string>('')
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function loadAll() {
    const token = await getToken(); if (!token) return
    const [cs, asgs, evs] = await Promise.all([
      couriersApi.list(token).catch(() => []),
      assignmentsApi.forOrder(orderId, token).catch(() => []),
      deliveryEventsApi.forOrder(orderId, token).catch(() => []),
    ])
    setCouriers(cs.filter(c => c.isActive))
    const current = asgs.find(a => a.status === 'ASSIGNED' || a.status === 'PICKED_UP') ?? null
    setActive(current)
    setEvents(evs)
  }

  useEffect(() => { loadAll() }, [orderId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function assign() {
    if (!pick) return
    setBusy('assign'); setErr(null)
    try {
      const token = await getToken(); if (!token) throw new Error('Not signed in')
      await assignmentsApi.assign(orderId, pick, token)
      setPick('')
      await loadAll()
    } catch (e: any) { setErr(e?.message ?? 'Assign failed') }
    finally { setBusy(null) }
  }

  async function transition(next: 'PICKED_UP' | 'DELIVERED' | 'FAILED') {
    setBusy(next); setErr(null)
    try {
      const token = await getToken(); if (!token) throw new Error('Not signed in')
      let reason: string | undefined
      if (next === 'FAILED') {
        const r = window.prompt('Reason for failed delivery?')
        if (!r) { setBusy(null); return }
        reason = r
      }
      await assignmentsApi.transition(orderId, next, token, reason)
      await loadAll()
    } catch (e: any) { setErr(e?.message ?? 'Update failed') }
    finally { setBusy(null) }
  }

  const courier = active?.courier ?? null

  return (
    <div className="rounded-2xl border p-5 mb-5"
      style={{ background: 'linear-gradient(135deg,#1E40AF 0%,#2563EB 100%)', borderColor: '#1E40AF', color: '#fff' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Truck size={18} />
          <h2 className="text-sm font-extrabold uppercase tracking-wider">Delivery control</h2>
        </div>
        <button onClick={loadAll} className="text-xs opacity-80 hover:opacity-100 inline-flex items-center gap-1">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {deliveryCode && (
        <div className="mb-4 p-3 rounded-xl border border-dashed flex items-center justify-between"
          style={{ borderColor: 'rgba(16,185,129,0.6)', background: 'rgba(16,185,129,0.15)' }}>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#A7F3D0' }}>Delivery code</div>
            <div className="text-xs opacity-80">Courier must verify on doorstep before marking delivered.</div>
          </div>
          <div className="text-3xl font-extrabold tracking-[0.3em] font-mono">{deliveryCode}</div>
        </div>
      )}

      {courier ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                {courier.name.split(' ').map(p => p[0]).slice(0, 2).join('')}
              </div>
              <div>
                <div className="text-sm font-bold">{courier.name}</div>
                <div className="text-xs opacity-80 font-mono">{courier.phone}{courier.vehicle ? ` · ${courier.vehicle}` : ''}</div>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              {active!.status}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {active!.status === 'ASSIGNED' && (
              <button disabled={!!busy} onClick={() => transition('PICKED_UP')}
                className="px-3 py-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5"
                style={{ background: '#fff', color: '#1E40AF' }}>
                {busy === 'PICKED_UP' ? <Loader2 size={14} className="animate-spin" /> : <Bike size={14} />} Mark picked up
              </button>
            )}
            <button disabled={!!busy} onClick={() => transition('DELIVERED')}
              className="px-3 py-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5"
              style={{ background: '#10B981', color: '#fff' }}>
              {busy === 'DELIVERED' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Mark delivered
            </button>
            <button disabled={!!busy} onClick={() => transition('FAILED')}
              className="px-3 py-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 border"
              style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}>
              {busy === 'FAILED' ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />} Mark failed
            </button>
          </div>
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
            <span className="text-xs opacity-80">Reassign to: </span>
            <select value={pick} onChange={e => setPick(e.target.value)}
              className="text-xs px-2 py-1 rounded ml-1"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
              <option value="" style={{ color: '#000' }}>Choose courier…</option>
              {couriers.filter(c => c.id !== courier.id).map(c => (
                <option key={c.id} value={c.id} style={{ color: '#000' }}>{c.name} · {c.employmentType}</option>
              ))}
            </select>
            <button disabled={!pick || !!busy} onClick={assign}
              className="ml-2 px-3 py-1 rounded text-xs font-bold"
              style={{ background: '#F97316', color: '#fff', opacity: pick ? 1 : 0.5 }}>
              {busy === 'assign' ? <Loader2 size={12} className="animate-spin inline" /> : 'Reassign'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="text-xs opacity-90 mb-3">No courier assigned yet. Pick a rider to dispatch this order.</div>
          <div className="flex flex-col md:flex-row gap-2">
            <select value={pick} onChange={e => setPick(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
              <option value="" style={{ color: '#000' }}>Choose courier…</option>
              {couriers.map(c => (
                <option key={c.id} value={c.id} style={{ color: '#000' }}>
                  {c.name} · {c.employmentType}{c.vehicle ? ` · ${c.vehicle}` : ''}
                </option>
              ))}
            </select>
            <button disabled={!pick || !!busy} onClick={assign}
              className="px-4 py-2 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-1.5"
              style={{ background: '#F97316', color: '#fff', opacity: pick ? 1 : 0.5 }}>
              {busy === 'assign' ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Assign
            </button>
          </div>
        </div>
      )}

      {err && <div className="mt-3 text-xs px-3 py-2 rounded" style={{ background: 'rgba(220,38,38,0.85)', color: '#fff' }}>{err}</div>}

      {/* Event timeline */}
      <div className="mt-5 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
        <div className="text-[10px] uppercase tracking-wider font-bold mb-2 opacity-80">Event timeline</div>
        {events.length === 0 ? (
          <div className="text-xs opacity-70">No events recorded.</div>
        ) : (
          <ol className="space-y-1.5 max-h-48 overflow-y-auto text-xs font-mono">
            {events.map(ev => (
              <li key={ev.id} className="flex items-start gap-2">
                <span className="opacity-60 shrink-0">{new Date(ev.createdAt).toLocaleString('en-GB', { hour12: false })}</span>
                <span className="font-bold">{ev.type}</span>
                {ev.actorName && <span className="opacity-80">by {ev.actorName}</span>}
                {ev.note && <span className="opacity-80">— {ev.note}</span>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
