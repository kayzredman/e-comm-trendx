'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { categoriesApi, type Category } from '@/lib/api'
import { slugify } from '@/lib/utils'
import { Plus, Pencil, Trash2, Check, X, Tag, FolderTree, Image as ImageIcon, Loader2, Search } from 'lucide-react'

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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(empty)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

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
    setDrawerOpen(true)
    setError(null)
  }

  function openEdit(cat: Category) {
    setEditing(cat.id)
    setForm({ name: cat.name, slug: cat.slug, parentId: cat.parentId ?? '', imageUrl: cat.imageUrl ?? '' })
    setDrawerOpen(true)
    setError(null)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setTimeout(() => {
      setEditing(null)
      setForm(empty)
      setError(null)
    }, 200)
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
      closeDrawer()
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await categoriesApi.delete(id, token)
      setCategories(prev => prev.filter(c => c.id !== id))
    } catch (err: any) {
      alert(err.message ?? 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const parentOptions = categories.filter(c => c.id !== editing)
  const filtered = query
    ? categories.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.slug.toLowerCase().includes(query.toLowerCase()))
    : categories
  const topLevelCount = categories.filter(c => !c.parentId).length
  const subCount = categories.length - topLevelCount

  return (
    <div>
      {/* ── Toolbar: search + new ─────────────────── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 min-w-[200px]"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <Search size={15} style={{ color: 'var(--color-text-subtle)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search categories..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--color-text)' }}
          />
          {query && (
            <button onClick={() => setQuery('')} type="button" style={{ color: 'var(--color-text-subtle)' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Stat chips */}
        <div className="flex items-center gap-2">
          <Chip icon={<FolderTree size={12} />} label={`${topLevelCount} top-level`} color="#2563EB" bg="#DBEAFE" ring="#BFDBFE" />
          <Chip icon={<Tag size={12} />} label={`${subCount} sub`} color="#7C3AED" bg="#EDE9FE" ring="#DDD6FE" />
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'var(--color-primary)', boxShadow: '0 2px 6px rgba(37,99,235,.25)' }}
        >
          <Plus size={15} /> New category
        </button>
      </div>

      {/* ── Card grid ─────────────────────────────── */}
      {filtered.length === 0 ? (
        <div
          className="text-center py-20 rounded-2xl border"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--color-surface-muted)' }}
          >
            <Tag size={28} style={{ color: 'var(--color-text-subtle)' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>
            {query ? 'No matches' : 'No categories yet'}
          </p>
          <p className="text-sm mt-1 mb-5" style={{ color: 'var(--color-text-muted)' }}>
            {query ? 'Try a different search term.' : 'Create your first category to organise products.'}
          </p>
          {!query && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus size={15} /> Create category
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(cat => {
            const parent = categories.find(c => c.id === cat.parentId)
            const childCount = categories.filter(c => c.parentId === cat.id).length
            const isDeleting = deletingId === cat.id
            return (
              <div
                key={cat.id}
                className="group rounded-2xl border overflow-hidden transition-all hover:-translate-y-0.5"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  boxShadow: '0 1px 3px rgba(0,0,0,.04)',
                  opacity: isDeleting ? 0.5 : 1,
                }}
              >
                {/* Image / placeholder */}
                <div
                  className="relative h-32 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)' }}
                >
                  {cat.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'var(--color-text-subtle)' }}>
                      <ImageIcon size={32} />
                    </div>
                  )}
                  {parent && (
                    <div
                      className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-md"
                      style={{ background: 'rgba(255,255,255,.85)', color: '#475569' }}
                    >
                      <FolderTree size={10} /> {parent.name}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-4">
                  <h3 className="font-bold text-base truncate" style={{ color: 'var(--color-text)' }} title={cat.name}>
                    {cat.name}
                  </h3>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                    /{cat.slug}
                  </p>

                  <div className="flex items-center gap-1.5 mt-3">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                      style={{ background: 'var(--color-surface-muted)', color: 'var(--color-text-muted)' }}
                    >
                      <Tag size={10} /> {childCount} sub
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <button
                      onClick={() => openEdit(cat)}
                      disabled={isDeleting}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:bg-slate-50 disabled:opacity-50"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      disabled={isDeleting}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:bg-red-50 disabled:opacity-50"
                      style={{ borderColor: '#FCA5A5', color: 'var(--color-error)' }}
                    >
                      {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Slide-over drawer ─────────────────────── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeDrawer}
            className="fixed inset-0 z-40 transition-opacity"
            style={{ background: 'rgba(15,23,42,.4)', backdropFilter: 'blur(2px)' }}
          />

          {/* Drawer */}
          <aside
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md flex flex-col"
            style={{ background: 'var(--color-surface)', boxShadow: '-8px 0 24px rgba(0,0,0,.12)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>
                  {editing ? 'Editing category' : 'New category'}
                </p>
                <h2 className="text-lg font-bold mt-0.5" style={{ color: 'var(--color-text)' }}>
                  {editing ? form.name || 'Untitled' : 'Create category'}
                </h2>
              </div>
              <button
                onClick={closeDrawer}
                type="button"
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && (
                <div
                  className="rounded-lg border px-3 py-2 flex items-start gap-2"
                  style={{ background: '#FEF2F2', borderColor: '#FECACA', color: 'var(--color-error)' }}
                >
                  <X size={14} className="mt-0.5" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Image preview */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Preview
                </p>
                <div
                  className="relative h-40 rounded-xl overflow-hidden border"
                  style={{ background: 'linear-gradient(135deg, #F8FAFC, #F1F5F9)', borderColor: 'var(--color-border)' }}
                >
                  {form.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ color: 'var(--color-text-subtle)' }}>
                      <ImageIcon size={28} />
                      <p className="text-xs">Add an image URL below</p>
                    </div>
                  )}
                </div>
              </div>

              <DrawerField label="Name" required>
                <input
                  required
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="e.g. Women's Clothing"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' } as any}
                />
              </DrawerField>

              <DrawerField label="Slug" hint="Used in storefront URLs.">
                <input
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="auto-generated"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' } as any}
                />
              </DrawerField>

              <DrawerField label="Parent category">
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
              </DrawerField>

              <DrawerField label="Image URL">
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </DrawerField>
            </form>

            {/* Footer actions */}
            <div
              className="px-5 py-4 border-t flex gap-2"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}
            >
              <button
                type="button"
                onClick={closeDrawer}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', background: 'var(--color-surface)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-all hover:scale-[1.02] disabled:hover:scale-100"
                style={{ background: 'var(--color-primary)', boxShadow: '0 2px 6px rgba(37,99,235,.25)' }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editing ? 'Save changes' : 'Create'}
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

/* ── Helpers ──────────────────────────────────── */

function DrawerField({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
        {label} {required && <span style={{ color: 'var(--color-error)' }}>*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-subtle)' }}>{hint}</p>
      )}
    </div>
  )
}

function Chip({ icon, label, color, bg, ring }: { icon: React.ReactNode; label: string; color: string; bg: string; ring: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap"
      style={{ background: bg, color, borderColor: ring }}
    >
      {icon} {label}
    </span>
  )
}
