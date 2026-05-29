'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { deliveryApi, type DeliveryZone, type FeeStrategy } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { Plus, Pencil, Trash2, Check, X, Truck } from 'lucide-react'

type FormState = {
  name: string
  baseFee: string
  feeStrategy: FeeStrategy
  feePerKm: string
  freeThreshold: string
  isActive: boolean
  requiresPrepayment: boolean
}

const emptyForm: FormState = {
  name: '',
  baseFee: '0',
  feeStrategy: 'FLAT',
  feePerKm: '',
  freeThreshold: '',
  isActive: true,
  requiresPrepayment: false,
}

const STRATEGY_LABEL: Record<FeeStrategy, string> = {
  FLAT: 'Flat fee',
  DISTANCE_BASED: 'Distance-based',
  FREE_THRESHOLD: 'Free above threshold',
  COMBINED: 'Combined',
}

const STRATEGY_DESC: Record<FeeStrategy, string> = {
  FLAT: 'Fixed delivery fee regardless of order size.',
  DISTANCE_BASED: 'Base fee + per-km rate.',
  FREE_THRESHOLD: 'Free delivery above a minimum order value; flat fee below.',
  COMBINED: 'Free above threshold, else base + per-km.',
}

export default function ZoneManager({ initialZones }: { initialZones: DeliveryZone[] }) {
  const { getToken } = useAuth()
  const [zones, setZones] = useState<DeliveryZone[]>(initialZones)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
    setError(null)
  }

  function openEdit(zone: DeliveryZone) {
    setEditing(zone.id)
    setForm({
      name: zone.name,
      baseFee: zone.baseFee,
      feeStrategy: zone.feeStrategy,
      feePerKm: zone.feePerKm ?? '',
      freeThreshold: zone.freeThreshold ?? '',
      isActive: zone.isActive,
      requiresPrepayment: zone.requiresPrepayment ?? false,
    })
    setShowForm(true)
    setError(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const payload: Partial<DeliveryZone> & { name: string; baseFee: string } = {
        id: editing ?? undefined,
        name: form.name,
        baseFee: form.baseFee,
        feeStrategy: form.feeStrategy,
        feePerKm: form.feePerKm || null,
        freeThreshold: form.freeThreshold || null,
        isActive: form.isActive,
        requiresPrepayment: form.requiresPrepayment,
      }
      const saved = await deliveryApi.upsert(payload, token)
      setZones(prev =>
        editing
          ? prev.map(z => z.id === editing ? saved : z)
          : [saved, ...prev]
      )
      closeForm()
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await deliveryApi.delete(id, token)
      setZones(prev => prev.filter(z => z.id !== id))
    } catch (err: any) {
      alert(err.message ?? 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  const needsKm = form.feeStrategy === 'DISTANCE_BASED' || form.feeStrategy === 'COMBINED'
  const needsThreshold = form.feeStrategy === 'FREE_THRESHOLD' || form.feeStrategy === 'COMBINED'

  const inputCls = 'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div>
      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border p-5 mb-6"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            {editing ? 'Edit zone' : 'New delivery zone'}
          </h2>

          {error && (
            <p className="text-sm mb-3 px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: 'var(--color-error)' }}>
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Zone name <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Greater Accra"
                className={inputCls}
                style={{ borderColor: 'var(--color-border)' }}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Fee strategy</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(STRATEGY_LABEL) as FeeStrategy[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, feeStrategy: s }))}
                    className="text-left p-3 rounded-lg border text-sm transition-all"
                    style={{
                      borderColor: form.feeStrategy === s ? 'var(--color-primary)' : 'var(--color-border)',
                      background: form.feeStrategy === s ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      color: form.feeStrategy === s ? 'var(--color-primary)' : 'var(--color-text)',
                    }}
                  >
                    <p className="font-semibold">{STRATEGY_LABEL[s]}</p>
                    <p className="text-xs mt-0.5 opacity-70">{STRATEGY_DESC[s]}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Base fee (GH₵) <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.baseFee}
                onChange={e => setForm(f => ({ ...f, baseFee: e.target.value }))}
                className={inputCls}
                style={{ borderColor: 'var(--color-border)' }}
              />
            </div>

            {needsKm && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Fee per km (GH₵)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.feePerKm}
                  onChange={e => setForm(f => ({ ...f, feePerKm: e.target.value }))}
                  placeholder="0.00"
                  className={inputCls}
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </div>
            )}

            {needsThreshold && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Free delivery above (GH₵)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.freeThreshold}
                  onChange={e => setForm(f => ({ ...f, freeThreshold: e.target.value }))}
                  placeholder="e.g. 200.00"
                  className={inputCls}
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 rounded"
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <label htmlFor="isActive" className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                Zone is active (shown to customers)
              </label>
            </div>

            <div className="sm:col-span-2 flex items-start gap-3 p-3 rounded-lg" style={{ background: '#FEF3C7' }}>
              <input
                id="requiresPrepayment"
                type="checkbox"
                checked={form.requiresPrepayment}
                onChange={e => setForm(f => ({ ...f, requiresPrepayment: e.target.checked }))}
                className="w-4 h-4 rounded mt-0.5"
                style={{ accentColor: '#B45309' }}
              />
              <label htmlFor="requiresPrepayment" className="text-sm" style={{ color: '#78350F' }}>
                <span className="font-semibold">Require prepayment for this zone</span>
                <span className="block text-xs mt-0.5">Cash on Delivery will be blocked at checkout. Use for high-fraud or far-out areas.</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'var(--color-primary)' }}
            >
              <Check size={16} /> {editing ? 'Save changes' : 'Create zone'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <X size={16} /> Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white mb-6"
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus size={16} /> New zone
        </button>
      )}

      {zones.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <Truck size={40} className="mx-auto mb-3" style={{ color: 'var(--color-text-subtle)' }} />
          <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>No delivery zones yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-subtle)' }}>Add zones to configure delivery fees by area</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-muted)' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Zone</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" style={{ color: 'var(--color-text-muted)' }}>Strategy</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Base fee</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell" style={{ color: 'var(--color-text-muted)' }}>Free threshold</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {zones.map(zone => (
                <tr key={zone.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{zone.name}</td>
                  <td className="px-4 py-3 hidden sm:table-cell" style={{ color: 'var(--color-text-muted)' }}>
                    {STRATEGY_LABEL[zone.feeStrategy]}
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-text)' }}>
                    {formatPrice(zone.baseFee)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--color-text-muted)' }}>
                    {zone.freeThreshold ? formatPrice(zone.freeThreshold) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background: zone.isActive ? '#DCFCE7' : '#F3F4F6',
                        color: zone.isActive ? '#16A34A' : '#6B7280',
                      }}
                    >
                      {zone.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(zone)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border mr-2"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(zone.id, zone.name)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                      style={{ borderColor: '#FCA5A5', color: 'var(--color-error)' }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
