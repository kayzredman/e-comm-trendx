'use client'

import { useEffect, useState, useTransition } from 'react'
import { useAuth } from '@clerk/nextjs'
import { MapPin, Plus, Trash2, Star, X } from 'lucide-react'
import { accountApi, type SavedAddress } from '@/lib/api'

type FormState = {
  label: string
  street: string
  city: string
  region: string
  country: string
  zip: string
  isDefault: boolean
}

const emptyForm: FormState = { label: '', street: '', city: '', region: '', country: 'GH', zip: '', isDefault: false }

export default function SavedAddressesPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formOpen, setFormOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        if (!token) return
        const list = await accountApi.listAddresses(token)
        if (!cancelled) setAddresses(list ?? [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn, getToken])

  function refresh(updated: SavedAddress[]) {
    setAddresses(updated ?? [])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const token = await getToken()
        if (!token) throw new Error('Not authenticated')
        const updated = await accountApi.addAddress(
          { label: form.label, street: form.street, city: form.city, region: form.region, country: form.country, zip: form.zip || null, isDefault: form.isDefault },
          token,
        )
        refresh(updated)
        setForm(emptyForm)
        setFormOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  async function remove(id: string) {
    if (!confirm('Remove this address?')) return
    startTransition(async () => {
      try {
        const token = await getToken()
        if (!token) return
        const updated = await accountApi.removeAddress(id, token)
        refresh(updated)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove')
      }
    })
  }

  async function makeDefault(id: string) {
    startTransition(async () => {
      try {
        const token = await getToken()
        if (!token) return
        const updated = await accountApi.updateAddress(id, { isDefault: true }, token)
        refresh(updated)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update')
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Saved Addresses</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Quickly pick a delivery destination at checkout.
          </p>
        </div>
        {!formOpen && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: '#F97316' }}
          >
            <Plus size={16} /> Add address
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }}>
          {error}
        </div>
      )}

      {formOpen && (
        <form
          onSubmit={submit}
          className="rounded-2xl p-5 grid gap-3"
          style={{ background: '#fff', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>New address</p>
            <button type="button" onClick={() => { setFormOpen(false); setForm(emptyForm) }} className="p-1.5 rounded-lg hover:bg-gray-50">
              <X size={16} />
            </button>
          </div>
          <Input label="Label" value={form.label} onChange={v => setForm(f => ({ ...f, label: v }))} placeholder="Home, Office…" required />
          <Input label="Street" value={form.street} onChange={v => setForm(f => ({ ...f, street: v }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} required />
            <Input label="Region" value={form.region} onChange={v => setForm(f => ({ ...f, region: v }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Country" value={form.country} onChange={v => setForm(f => ({ ...f, country: v }))} required />
            <Input label="ZIP / Postal" value={form.zip} onChange={v => setForm(f => ({ ...f, zip: v }))} />
          </div>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text)' }}>
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
            />
            Set as default
          </label>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: '#2563EB' }}
            >
              {pending ? 'Saving…' : 'Save address'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
      ) : addresses.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
          <MapPin size={32} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>No saved addresses yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Add one to speed up checkout.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map(addr => (
            <li
              key={addr.id}
              className="rounded-2xl p-4 flex flex-col gap-2"
              style={{ background: '#fff', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{addr.label}</p>
                  {addr.isDefault && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: '#FFEDD5', color: '#9A3412' }}>
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!addr.isDefault && (
                    <button
                      type="button"
                      onClick={() => makeDefault(addr.id)}
                      disabled={pending}
                      className="p-1.5 rounded-lg hover:bg-gray-50"
                      title="Make default"
                    >
                      <Star size={14} style={{ color: 'var(--color-text-muted)' }} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(addr.id)}
                    disabled={pending}
                    className="p-1.5 rounded-lg hover:bg-red-50"
                    title="Remove"
                  >
                    <Trash2 size={14} style={{ color: '#DC2626' }} />
                  </button>
                </div>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {addr.street}<br />
                {addr.city}, {addr.region}<br />
                {addr.country}{addr.zip ? ` · ${addr.zip}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Input(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{props.label}</span>
      <input
        type="text"
        value={props.value}
        onChange={e => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        required={props.required}
        className="px-3 py-2 rounded-lg text-sm outline-none focus:ring-2"
        style={{ border: '1px solid var(--color-border)', background: '#fff' }}
      />
    </label>
  )
}
