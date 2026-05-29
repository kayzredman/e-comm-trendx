'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { discountsApi, type DiscountCode, type DiscountType } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { Plus, Pencil, Trash2, Check, X, TicketPercent, Power } from 'lucide-react'

type FormState = {
  code: string
  type: DiscountType
  value: string
  minSubtotal: string
  maxUses: string
  expiresAt: string
  isActive: boolean
  isPromoted: boolean
  promoLabel: string
}

const emptyForm: FormState = {
  code: '',
  type: 'PERCENT',
  value: '10',
  minSubtotal: '0',
  maxUses: '',
  expiresAt: '',
  isActive: true,
  isPromoted: false,
  promoLabel: '',
}

function toFormState(c: DiscountCode): FormState {
  return {
    code: c.code,
    type: c.type,
    value: c.value,
    minSubtotal: c.minSubtotal,
    maxUses: c.maxUses == null ? '' : String(c.maxUses),
    expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
    isActive: c.isActive,
    isPromoted: c.isPromoted ?? false,
    promoLabel: c.promoLabel ?? '',
  }
}

function formatExpiry(iso: string | null): string {
  if (!iso) return 'No expiry'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function isExpired(c: DiscountCode): boolean {
  return !!c.expiresAt && new Date(c.expiresAt) < new Date()
}

function isExhausted(c: DiscountCode): boolean {
  return c.maxUses != null && c.usedCount >= c.maxUses
}

export default function DiscountsManager({ initialCodes }: { initialCodes: DiscountCode[] }) {
  const { getToken } = useAuth()
  const [codes, setCodes] = useState<DiscountCode[]>(initialCodes)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
    setError(null)
  }

  function openEdit(c: DiscountCode) {
    setEditingId(c.id)
    setForm(toFormState(c))
    setShowForm(true)
    setError(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const value = Number(form.value)
      if (!Number.isFinite(value) || value <= 0) throw new Error('Value must be greater than 0')
      if (form.type === 'PERCENT' && value > 100) throw new Error('Percent value cannot exceed 100')

      const saved = await discountsApi.upsert({
        id: editingId ?? undefined,
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value,
        minSubtotal: form.minSubtotal === '' ? 0 : Number(form.minSubtotal),
        maxUses: form.maxUses === '' ? null : Number(form.maxUses),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        isActive: form.isActive,
        isPromoted: form.isPromoted,
        promoLabel: form.promoLabel.trim() || null,
      }, token)

      setCodes(prev =>
        editingId
          ? prev.map(c => c.id === editingId ? saved : c)
          : [saved, ...prev]
      )
      closeForm()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(c: DiscountCode) {
    if (!confirm(`Delete code "${c.code}"? This cannot be undone.`)) return
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await discountsApi.delete(c.id, token)
      setCodes(prev => prev.filter(x => x.id !== c.id))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  async function toggleActive(c: DiscountCode) {
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const saved = await discountsApi.upsert({
        id: c.id,
        code: c.code,
        type: c.type,
        value: Number(c.value),
        minSubtotal: Number(c.minSubtotal),
        maxUses: c.maxUses,
        expiresAt: c.expiresAt,
        isActive: !c.isActive,
        isPromoted: c.isPromoted,
        promoLabel: c.promoLabel,
      }, token)
      setCodes(prev => prev.map(x => x.id === c.id ? saved : x))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Update failed')
    }
  }

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
            {editingId ? 'Edit discount code' : 'New discount code'}
          </h2>

          {error && (
            <p className="text-sm mb-3 px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: 'var(--color-error)' }}>
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Code <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                required
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. WELCOME10"
                className={inputCls + ' font-mono tracking-wider uppercase'}
                style={{ borderColor: 'var(--color-border)' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>
                Customers type this at checkout. Codes are stored uppercase.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Type</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {(['PERCENT', 'FIXED'] as DiscountType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    className="text-left p-3 rounded-lg border text-sm transition-all"
                    style={{
                      borderColor: form.type === t ? 'var(--color-primary)' : 'var(--color-border)',
                      background: form.type === t ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      color: form.type === t ? 'var(--color-primary)' : 'var(--color-text)',
                    }}
                  >
                    <p className="font-semibold">{t === 'PERCENT' ? 'Percentage off' : 'Fixed amount off'}</p>
                    <p className="text-xs mt-0.5 opacity-70">
                      {t === 'PERCENT' ? 'Discount as a % of subtotal (capped at 100).' : 'Flat GH₵ amount off the subtotal.'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                {form.type === 'PERCENT' ? 'Percent (%)' : 'Amount (GH₵)'} <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                required
                type="number"
                min="0"
                step={form.type === 'PERCENT' ? '1' : '0.01'}
                max={form.type === 'PERCENT' ? '100' : undefined}
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                className={inputCls}
                style={{ borderColor: 'var(--color-border)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Minimum subtotal (GH₵)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.minSubtotal}
                onChange={e => setForm(f => ({ ...f, minSubtotal: e.target.value }))}
                placeholder="0.00"
                className={inputCls}
                style={{ borderColor: 'var(--color-border)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Max uses</label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.maxUses}
                onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                placeholder="Leave empty for unlimited"
                className={inputCls}
                style={{ borderColor: 'var(--color-border)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Expires on</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                className={inputCls}
                style={{ borderColor: 'var(--color-border)' }}
              />
            </div>

            <div className="flex items-center gap-3 sm:col-span-2">
              <input
                id="discountActive"
                type="checkbox"
                checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 rounded"
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <label htmlFor="discountActive" className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                Code is active (customers can redeem at checkout)
              </label>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-start gap-3">
                <input
                  id="discountPromoted"
                  type="checkbox"
                  checked={form.isPromoted}
                  onChange={e => setForm(f => ({ ...f, isPromoted: e.target.checked }))}
                  className="w-4 h-4 rounded mt-0.5"
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                <label htmlFor="discountPromoted" className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  Promote this code
                  <span className="block text-xs font-normal mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                    Shows a dismissible strip above the header and a one-click apply suggestion at checkout.
                  </span>
                </label>
              </div>
            </div>

            {form.isPromoted && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  Promo label{' '}
                  <span className="text-xs font-normal" style={{ color: 'var(--color-text-subtle)' }}>
                    (optional)
                  </span>
                </label>
                <input
                  type="text"
                  maxLength={140}
                  value={form.promoLabel}
                  onChange={e => setForm(f => ({ ...f, promoLabel: e.target.value }))}
                  placeholder="e.g. Weekend sale — 10% off everything"
                  className={inputCls}
                  style={{ borderColor: 'var(--color-border)' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>
                  Leave blank to auto-generate from value + min subtotal.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-5">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'var(--color-primary)' }}
            >
              <Check size={16} /> {editingId ? 'Save changes' : 'Create code'}
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
          <Plus size={16} /> New code
        </button>
      )}

      {codes.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <TicketPercent size={40} className="mx-auto mb-3" style={{ color: 'var(--color-text-subtle)' }} />
          <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>No discount codes yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-subtle)' }}>Create codes for campaigns, loyalty perks, or first-order offers</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-muted)' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Code</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Discount</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" style={{ color: 'var(--color-text-muted)' }}>Min subtotal</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell" style={{ color: 'var(--color-text-muted)' }}>Usage</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell" style={{ color: 'var(--color-text-muted)' }}>Expires</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {codes.map(c => {
                const expired = isExpired(c)
                const exhausted = isExhausted(c)
                const status = !c.isActive
                  ? { label: 'Inactive', bg: '#F3F4F6', fg: '#6B7280' }
                  : expired
                  ? { label: 'Expired', bg: '#FEF3C7', fg: '#B45309' }
                  : exhausted
                  ? { label: 'Used up', bg: '#FEE2E2', fg: '#B91C1C' }
                  : { label: 'Active', bg: '#DCFCE7', fg: '#16A34A' }

                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-3 font-mono font-semibold tracking-wider" style={{ color: 'var(--color-text)' }}>
                      <div className="flex items-center gap-2">
                        <span>{c.code}</span>
                        {c.isPromoted && (
                          <span
                            className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-sans"
                            style={{ background: '#FFEDD5', color: '#9A3412' }}
                          >
                            Promoted
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-text)' }}>
                      {c.type === 'PERCENT' ? `${Number(c.value)}%` : formatPrice(c.value)}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell" style={{ color: 'var(--color-text-muted)' }}>
                      {Number(c.minSubtotal) > 0 ? formatPrice(c.minSubtotal) : '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--color-text-muted)' }}>
                      {c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : ''}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell" style={{ color: 'var(--color-text-muted)' }}>
                      {formatExpiry(c.expiresAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: status.bg, color: status.fg }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => toggleActive(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border mr-2"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        title={c.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <Power size={13} /> {c.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => openEdit(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border mr-2"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                        style={{ borderColor: '#FCA5A5', color: 'var(--color-error)' }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
