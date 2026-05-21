'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { cmsApi, type CmsSection, type SectionType } from '@/lib/api'
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Loader2,
  Save,
  X,
} from 'lucide-react'

// ─── Section type config ───────────────────────────────────────────────────────

const TYPE_LABELS: Record<SectionType, { label: string; color: string; bg: string; desc: string }> = {
  HERO:         { label: 'Hero Banner',    color: '#2563EB', bg: '#DBEAFE', desc: 'Full-width hero with title, subtitle, and CTA' },
  FEATURED:     { label: 'Featured',       color: '#7C3AED', bg: '#EDE9FE', desc: 'Featured products or category highlight' },
  BANNER:       { label: 'Promo Banner',   color: '#EA580C', bg: '#FFEDD5', desc: 'Promotional strip with a link' },
  ANNOUNCEMENT: { label: 'Announcement',  color: '#16A34A', bg: '#DCFCE7', desc: 'Short info/promo announcement bar' },
}

// ─── Default data shapes ───────────────────────────────────────────────────────

const DEFAULT_DATA: Record<SectionType, Record<string, string>> = {
  HERO: {
    title: '',
    subtitle: '',
    ctaLabel: 'Shop now',
    ctaLink: '/products',
    imageUrl: '',
    accentColor: '#E11D48',
  },
  FEATURED: {
    title: '',
    categoryId: '',
  },
  BANNER: {
    text: '',
    linkLabel: 'Learn more',
    linkUrl: '/products',
    bgColor: '#E11D48',
  },
  ANNOUNCEMENT: {
    message: '',
    type: 'promo',
  },
}

// ─── Field definitions per type ───────────────────────────────────────────────

type FieldDef = { key: string; label: string; placeholder?: string; type?: string }

const FIELDS: Record<SectionType, FieldDef[]> = {
  HERO: [
    { key: 'title',       label: 'Headline',     placeholder: 'e.g. New Season Drop' },
    { key: 'subtitle',    label: 'Subtext',       placeholder: 'e.g. Discover the latest styles' },
    { key: 'ctaLabel',    label: 'Button text',   placeholder: 'Shop now' },
    { key: 'ctaLink',     label: 'Button link',   placeholder: '/products' },
    { key: 'imageUrl',    label: 'Image URL',     placeholder: 'https://…' },
    { key: 'accentColor', label: 'Accent colour', placeholder: '#E11D48', type: 'color' },
  ],
  FEATURED: [
    { key: 'title',      label: 'Section title', placeholder: 'e.g. Trending Now' },
    { key: 'categoryId', label: 'Category ID',   placeholder: 'cat_fashion' },
  ],
  BANNER: [
    { key: 'text',      label: 'Banner text',  placeholder: 'Free delivery on orders over ₵200' },
    { key: 'linkLabel', label: 'Link text',    placeholder: 'Shop now' },
    { key: 'linkUrl',   label: 'Link URL',     placeholder: '/products' },
    { key: 'bgColor',   label: 'Background colour', placeholder: '#E11D48', type: 'color' },
  ],
  ANNOUNCEMENT: [
    { key: 'message', label: 'Message', placeholder: 'e.g. 🎉 Summer sale — up to 40% off' },
    { key: 'type',    label: 'Style',   placeholder: 'promo | info | warning' },
  ],
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = { initialSections: CmsSection[] }

export default function SectionManager({ initialSections }: Props) {
  const { getToken } = useAuth()
  const [sections, setSections] = useState<CmsSection[]>(initialSections)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  // New section form state
  const [newType, setNewType] = useState<SectionType>('HERO')
  const [newData, setNewData] = useState<Record<string, string>>(DEFAULT_DATA.HERO)

  function handleTypeChange(t: SectionType) {
    setNewType(t)
    setNewData(DEFAULT_DATA[t])
  }

  function handleDataChange(key: string, value: string) {
    setNewData((d) => ({ ...d, [key]: value }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const maxOrder = sections.reduce((m, s) => Math.max(m, s.order), 0)
      const created = await cmsApi.upsertSection(
        {
          page: 'HOME',
          type: newType,
          data: newData,
          order: maxOrder + 1,
          isActive: true,
        },
        token,
      )
      setSections((prev) => [...prev, created])
      setShowForm(false)
      setNewType('HERO')
      setNewData(DEFAULT_DATA.HERO)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save section.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(section: CmsSection) {
    const token = await getToken()
    if (!token) return
    try {
      const updated = await cmsApi.upsertSection({ ...section, isActive: !section.isActive }, token)
      setSections((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    } catch {}
  }

  async function moveSection(section: CmsSection, direction: 'up' | 'down') {
    const idx = sections.findIndex((s) => s.id === section.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sections.length) return

    const token = await getToken()
    if (!token) return

    const other = sections[swapIdx]
    try {
      const [updA, updB] = await Promise.all([
        cmsApi.upsertSection({ ...section, order: other.order }, token),
        cmsApi.upsertSection({ ...other, order: section.order }, token),
      ])
      setSections((prev) =>
        prev
          .map((s) => (s.id === updA.id ? updA : s.id === updB.id ? updB : s))
          .sort((a, b) => a.order - b.order),
      )
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this section?')) return
    setDeletingId(id)
    try {
      const token = await getToken()
      if (!token) return
      await cmsApi.deleteSection(id, token)
      setSections((prev) => prev.filter((s) => s.id !== id))
    } catch {}
    setDeletingId(null)
  }

  const sorted = [...sections].sort((a, b) => a.order - b.order)

  return (
    <div className="max-w-3xl">
      {/* Section list */}
      {sorted.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center mb-6"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No sections yet. Add your first section below.
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {sorted.map((section, idx) => {
            const cfg = TYPE_LABELS[section.type]
            const data = section.data as Record<string, string>
            return (
              <div
                key={section.id}
                className="rounded-2xl border flex items-center gap-4 p-4"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-surface)',
                  opacity: section.isActive ? 1 : 0.5,
                }}
              >
                {/* Type badge */}
                <div
                  className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {cfg.label}
                </div>

                {/* Preview info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                    {(data.title as string) || (data.text as string) || (data.message as string) || '—'}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                    Order: {section.order} ·{' '}
                    {section.isActive ? (
                      <span style={{ color: '#16A34A' }}>Visible</span>
                    ) : (
                      <span style={{ color: '#6B7280' }}>Hidden</span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Reorder */}
                  <button
                    onClick={() => moveSection(section, 'up')}
                    disabled={idx === 0}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                    title="Move up"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => moveSection(section, 'down')}
                    disabled={idx === sorted.length - 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                    title="Move down"
                  >
                    <ChevronDown size={16} />
                  </button>

                  {/* Toggle visibility */}
                  <button
                    onClick={() => toggleActive(section)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                    style={{ color: section.isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
                    title={section.isActive ? 'Hide section' : 'Show section'}
                  >
                    {section.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(section.id)}
                    disabled={deletingId === section.id}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors"
                    style={{ color: '#DC2626' }}
                    title="Delete"
                  >
                    {deletingId === section.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add section form */}
      {showForm ? (
        <div
          className="rounded-2xl border p-6"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-extrabold" style={{ color: 'var(--color-text)' }}>
              New Section
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleAdd} className="space-y-5">
            {/* Type selector */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Section type
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(TYPE_LABELS) as SectionType[]).map((t) => {
                  const cfg = TYPE_LABELS[t]
                  const active = newType === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTypeChange(t)}
                      className="p-3 rounded-xl border text-left transition-all"
                      style={{
                        borderColor: active ? cfg.color : 'var(--color-border)',
                        background: active ? cfg.bg : 'transparent',
                        outline: active ? `2px solid ${cfg.color}` : 'none',
                        outlineOffset: '-2px',
                      }}
                    >
                      <p className="text-xs font-bold" style={{ color: active ? cfg.color : 'var(--color-text)' }}>
                        {cfg.label}
                      </p>
                      <p className="text-xs mt-0.5 leading-tight" style={{ color: 'var(--color-text-muted)' }}>
                        {cfg.desc}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Dynamic fields */}
            <div className="grid sm:grid-cols-2 gap-4">
              {FIELDS[newType].map((field) => (
                <div key={field.key} className={field.type === 'color' ? '' : ''}>
                  <label
                    className="block text-xs font-semibold mb-1.5"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {field.label}
                  </label>
                  {field.type === 'color' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newData[field.key] || '#000000'}
                        onChange={(e) => handleDataChange(field.key, e.target.value)}
                        className="w-10 h-10 rounded-lg border cursor-pointer p-1"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                      <input
                        type="text"
                        value={newData[field.key] || ''}
                        onChange={(e) => handleDataChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
                        style={{
                          borderColor: 'var(--color-border)',
                          background: '#F8F9FA',
                          color: 'var(--color-text)',
                        }}
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={newData[field.key] || ''}
                      onChange={(e) => handleDataChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                      style={{
                        borderColor: 'var(--color-border)',
                        background: '#F8F9FA',
                        color: 'var(--color-text)',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div
                className="p-3 rounded-xl text-sm font-medium"
                style={{ background: '#FEF2F2', color: '#DC2626' }}
              >
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-opacity"
                style={{ background: 'var(--color-primary)' }}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? 'Saving…' : 'Add Section'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus size={18} /> Add Section
        </button>
      )}
    </div>
  )
}
