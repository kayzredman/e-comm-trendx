'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { couriersApi, type CourierWithStats, type CourierInput, type CourierType } from '@/lib/api'
import { Plus, Bike, X, Loader2, Check } from 'lucide-react'

const blank: CourierInput = {
  name: '',
  phone: '',
  employmentType: 'FREELANCE',
  commissionPct: '15',
  vehicle: '',
  momoNumber: '',
  isActive: true,
}

export default function CouriersManager({ initial }: { initial: CourierWithStats[] }) {
  const { getToken } = useAuth()
  const [rows, setRows] = useState<CourierWithStats[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CourierInput>(blank)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const active = rows.filter(r => r.isActive).length
  const totalDeliveries30d = rows.reduce((a, b) => a + b.deliveries30d, 0)
  const avgPerDay = Math.round((totalDeliveries30d / 30) * 10) / 10
  const fleet = rows.filter(r => r.isActive && r.employmentType === 'FLEET').length
  const freelance = rows.filter(r => r.isActive && r.employmentType === 'FREELANCE').length

  function startCreate() {
    setEditingId(null); setForm(blank); setErr(null); setShowForm(true)
  }
  function startEdit(c: CourierWithStats) {
    setEditingId(c.id)
    setForm({
      name: c.name,
      phone: c.phone,
      employmentType: c.employmentType,
      commissionPct: c.commissionPct,
      vehicle: c.vehicle ?? '',
      momoNumber: c.momoNumber ?? '',
      isActive: c.isActive,
    })
    setErr(null); setShowForm(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setErr(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not signed in')
      if (editingId) {
        const updated = await couriersApi.update(editingId, form, token)
        setRows(prev => prev.map(r => r.id === editingId ? { ...r, ...updated } : r))
      } else {
        const created = await couriersApi.create(form, token)
        setRows(prev => [{ ...created, deliveries30d: 0, delivered30d: 0, onTimePct: null }, ...prev])
      }
      setShowForm(false)
    } catch (e: any) {
      setErr(e?.message ?? 'Save failed')
    } finally { setSaving(false) }
  }

  async function deactivate(id: string) {
    if (!confirm('Deactivate this courier? They will no longer be assignable.')) return
    const token = await getToken()
    if (!token) return
    const updated = await couriersApi.deactivate(id, token)
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r))
  }

  return (
    <div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi label="Active couriers" value={String(active)} sub={`${fleet} fleet · ${freelance} freelance`} />
        <Kpi label="Deliveries (30d)" value={String(totalDeliveries30d)} sub={`avg ${avgPerDay}/day`} accent="emerald" />
        <Kpi label="Total roster" value={String(rows.length)} sub={`${rows.length - active} inactive`} accent="orange" />
        <Kpi label="Avg on-time" value={`${avgOnTime(rows)}%`} sub="last 30 days · DELIVERED rate" accent="cobalt" />
      </div>

      {/* Header + add */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          {rows.length} courier{rows.length !== 1 ? 's' : ''}
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
          style={{ background: '#1E40AF', color: '#fff' }}
        >
          <Plus size={14} /> Add courier
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--color-surface-muted)' }}>
              <Th>Courier</Th>
              <Th>Type</Th>
              <Th>Vehicle</Th>
              <Th align="right">Deliveries (30d)</Th>
              <Th align="right">On-time</Th>
              <Th>Status</Th>
              <Th align="right"></Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                No couriers yet. Add your first rider to start assigning deliveries.
              </td></tr>
            )}
            {rows.map(c => (
              <tr key={c.id} className="border-t" style={{ borderColor: 'var(--color-border)', opacity: c.isActive ? 1 : 0.5 }}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: '#DBEAFE', color: '#1E40AF' }}>{initials(c.name)}</div>
                    <div>
                      <div className="font-semibold" style={{ color: 'var(--color-text)' }}>{c.name}</div>
                      <div className="text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>{c.phone}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <Pill color={c.employmentType === 'FLEET' ? 'cobalt' : 'emerald'}>
                    {c.employmentType === 'FLEET' ? 'FLEET' : `FREELANCE · ${Number(c.commissionPct)}%`}
                  </Pill>
                </Td>
                <Td>{c.vehicle ?? <span style={{ color: 'var(--color-text-subtle)' }}>—</span>}</Td>
                <Td align="right" mono>{c.deliveries30d}</Td>
                <Td align="right" mono>{c.onTimePct !== null ? `${c.onTimePct}%` : '—'}</Td>
                <Td>
                  <Pill color={c.isActive ? 'emerald' : 'gray'}>
                    {c.isActive ? '● Active' : '○ Inactive'}
                  </Pill>
                </Td>
                <Td align="right">
                  <button onClick={() => startEdit(c)} className="text-xs font-semibold mr-2" style={{ color: '#1E40AF' }}>Edit</button>
                  {c.isActive && (
                    <button onClick={() => deactivate(c.id)} className="text-xs font-semibold" style={{ color: '#DC2626' }}>Deactivate</button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)' }}>
          <form onSubmit={submit} className="w-full max-w-md rounded-2xl p-6" style={{ background: '#fff' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Bike size={18} /> {editingId ? 'Edit courier' : 'Add courier'}
              </h2>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-slate-100"><X size={16} /></button>
            </div>

            <Field label="Full name">
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" />
            </Field>
            <Field label="Phone (E.164)">
              <input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+233 24 000 0000" className="input" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select value={form.employmentType} onChange={e => setForm({ ...form, employmentType: e.target.value as CourierType })} className="input">
                  <option value="FREELANCE">Freelance</option>
                  <option value="FLEET">Fleet (salary)</option>
                </select>
              </Field>
              <Field label={form.employmentType === 'FLEET' ? 'Commission (n/a)' : 'Commission %'}>
                <input
                  type="number" step="0.1" min="0" max="100"
                  disabled={form.employmentType === 'FLEET'}
                  value={form.commissionPct ?? '15'}
                  onChange={e => setForm({ ...form, commissionPct: e.target.value })}
                  className="input"
                />
              </Field>
            </div>

            <Field label="Vehicle (optional)">
              <input value={form.vehicle ?? ''} onChange={e => setForm({ ...form, vehicle: e.target.value })} className="input" placeholder="Honda CG · GR-1234-23" />
            </Field>
            <Field label="MoMo payout number (optional)">
              <input value={form.momoNumber ?? ''} onChange={e => setForm({ ...form, momoNumber: e.target.value })} className="input" />
            </Field>

            {err && (
              <div className="mb-3 text-xs px-3 py-2 rounded" style={{ background: '#FEE2E2', color: '#991B1B' }}>{err}</div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-semibold border" style={{ borderColor: 'var(--color-border)' }}>Cancel</button>
              <button disabled={saving} type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5" style={{ background: '#1E40AF', color: '#fff' }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
              </button>
            </div>
          </form>
        </div>
      )}

      <style jsx>{`
        .input {
          width: 100%; padding: 8px 12px; border-radius: 9px;
          border: 1px solid var(--color-border); background: var(--color-surface-muted);
          font-size: 13px; outline: none;
        }
        .input:focus { border-color: #1E40AF; background: #fff; }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text)' }}>{label}</span>
      {children}
    </label>
  )
}

function Th({ children, align }: { children?: React.ReactNode; align?: 'right' }) {
  return <th className="text-[10px] uppercase tracking-wider font-bold px-3 py-3" style={{ color: 'var(--color-text-muted)', textAlign: align ?? 'left' }}>{children}</th>
}
function Td({ children, align, mono }: { children: React.ReactNode; align?: 'right'; mono?: boolean }) {
  return <td className="px-3 py-3" style={{ textAlign: align ?? 'left', fontVariantNumeric: mono ? 'tabular-nums' : undefined }}>{children}</td>
}

function Pill({ children, color }: { children: React.ReactNode; color: 'cobalt' | 'emerald' | 'gray' | 'orange' }) {
  const styles = {
    cobalt: { background: '#DBEAFE', color: '#1E40AF' },
    emerald: { background: '#ECFDF5', color: '#059669' },
    gray: { background: '#F1F5F9', color: '#475569' },
    orange: { background: '#FFEDD5', color: '#9A3412' },
  } as const
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold" style={styles[color]}>{children}</span>
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: 'cobalt' | 'emerald' | 'orange' | 'amber' }) {
  const c = accent === 'emerald' ? '#059669' : accent === 'orange' ? '#9A3412' : accent === 'amber' ? '#B45309' : '#1E40AF'
  return (
    <div className="p-4 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: c }}>{label}</div>
      <div className="text-2xl font-extrabold tracking-tight mt-1.5" style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{sub}</div>}
    </div>
  )
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?'
}

function avgOnTime(rows: CourierWithStats[]): number {
  const withData = rows.filter(r => r.onTimePct !== null)
  if (withData.length === 0) return 0
  return Math.round(withData.reduce((a, b) => a + (b.onTimePct ?? 0), 0) / withData.length)
}
