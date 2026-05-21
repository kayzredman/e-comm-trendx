'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { categoriesApi, type Category } from '@/lib/api'
import { slugify } from '@/lib/utils'
import { Plus, Pencil, Trash2, Check, X, Tag } from 'lucide-react'

type FormState = {
  name: string
  slug: string
  parentId: string
  imageUrl: string
}

const empty: FormState = { name: '', slug: '', parentId: '', imageUrl: '' }

export default function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const { getToken } = useAuth()
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setField(key: keyof FormState, value: string) {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'name') next.slug = slugify(value)
      return next
    })
  }

  function openCreate() {
    setEditing(null)
    setForm(empty)
    setShowForm(true)
    setError(null)
  }

  function openEdit(cat: Category) {
    setEditing(cat.id)
    setForm({ name: cat.name, slug: cat.slug, parentId: cat.parentId ?? '', imageUrl: cat.imageUrl ?? '' })
    setShowForm(true)
    setError(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setForm(empty)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const payload = {
        name: form.name,
        slug: form.slug,
        parentId: form.parentId || null,
        imageUrl: form.imageUrl || null,
      }
      if (editing) {
        const updated = await categoriesApi.update(editing, payload, token) as Category
        setCategories(prev => prev.map(c => c.id === editing ? updated : c))
      } else {
        const created = await categoriesApi.create(payload, token) as Category
        setCategories(prev => [created, ...prev])
      }
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
      await categoriesApi.delete(id, token)
      setCategories(prev => prev.filter(c => c.id !== id))
    } catch (err: any) {
      alert(err.message ?? 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  const parentOptions = categories.filter(c => c.id !== editing)

  return (
    <div>
      {/* ── Create / Edit form ── */}
      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border p-5 mb-6"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            {editing ? 'Edit category' : 'New category'}
          </h2>

          {error && (
            <p className="text-sm mb-3 px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: 'var(--color-error)' }}>
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Name <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                required
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                placeholder="e.g. Women's Clothing"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as any}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Slug</label>
              <input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="auto-generated"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' } as any}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Parent category</label>
              <select
                value={form.parentId}
                onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <option value="">— None (top-level) —</option>
                {parentOptions.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Image URL</label>
              <input
                type="url"
                value={form.imageUrl}
                onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'var(--color-primary)' }}
            >
              <Check size={16} /> {editing ? 'Save changes' : 'Create category'}
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
          <Plus size={16} /> New category
        </button>
      )}

      {/* ── Category list ── */}
      {categories.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <Tag size={40} className="mx-auto mb-3" style={{ color: 'var(--color-text-subtle)' }} />
          <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>No categories yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-subtle)' }}>Create your first category above</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-muted)' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Name</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" style={{ color: 'var(--color-text-muted)' }}>Slug</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell" style={{ color: 'var(--color-text-muted)' }}>Parent</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => {
                const parent = categories.find(c => c.id === cat.parentId)
                return (
                  <tr key={cat.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                      {cat.imageUrl && (
                        <img src={cat.imageUrl} alt="" className="inline-block w-8 h-8 rounded object-cover mr-2 align-middle" />
                      )}
                      {cat.name}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell" style={{ color: 'var(--color-text-muted)' }}>{cat.slug}</td>
                    <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--color-text-muted)' }}>{parent?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEdit(cat)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border mr-2"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
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
