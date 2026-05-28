'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { productsApi, type Category, type ProductInput } from '@/lib/api'
import { slugify } from '@/lib/utils'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import ImageUploader from './ImageUploader'

type Props = {
  categories: Category[]
  product?: {
    id: string
    name: string
    slug: string
    description: string | null
    price: string
    comparePrice: string | null
    sku: string | null
    inventory: number
    categoryId: string | null
    images: string[]
    status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
  }
}

const inputCls = `
  w-full rounded-lg border px-3 py-2 text-sm outline-none transition
  focus:ring-2 focus:ring-blue-500
`.trim()

export default function ProductForm({ categories, product }: Props) {
  const { getToken } = useAuth()
  const router = useRouter()
  const isEdit = !!product

  const [form, setForm] = useState({
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    description: product?.description ?? '',
    price: product?.price ?? '',
    comparePrice: product?.comparePrice ?? '',
    sku: product?.sku ?? '',
    inventory: String(product?.inventory ?? 0),
    categoryId: product?.categoryId ?? '',
    images: product?.images?.join(', ') ?? '',
    status: product?.status ?? 'DRAFT' as 'ACTIVE' | 'DRAFT' | 'ARCHIVED',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setField(key: keyof typeof form, value: string) {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'name' && !isEdit) next.slug = slugify(value)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const payload: ProductInput = {
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        price: form.price,
        comparePrice: form.comparePrice || undefined,
        sku: form.sku || undefined,
        inventory: parseInt(form.inventory, 10) || 0,
        categoryId: form.categoryId || undefined,
        // Images are managed via the ImageUploader → product_images table.
        // We intentionally don't touch the legacy products.images[] column here
        // so existing URL strings are preserved until the migration script runs.
        status: form.status,
      }

      if (isEdit) {
        await productsApi.update(product.id, payload, token)
      } else {
        await productsApi.create(payload, token)
      }

      router.push('/cms/products')
      router.refresh()
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <Link
        href="/cms/products"
        className="inline-flex items-center gap-2 text-sm mb-6"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowLeft size={16} /> Back to products
      </Link>

      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text)' }}>
        {isEdit ? `Edit: ${product.name}` : 'New product'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p className="px-4 py-3 rounded-lg text-sm" style={{ background: '#FEF2F2', color: 'var(--color-error)' }}>
            {error}
          </p>
        )}

        {/* Name + Slug */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold mb-4 text-sm uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Basic info</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                Name <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                required
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                placeholder="e.g. Classic White Sneakers"
                className={inputCls}
                style={{ borderColor: 'var(--color-border)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Slug</label>
              <input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="auto-generated"
                className={inputCls}
                style={{ borderColor: 'var(--color-border)' }}
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Product description..."
              className={inputCls}
              style={{ borderColor: 'var(--color-border)', resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold mb-4 text-sm uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Pricing</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                Price (GH₵) <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={e => setField('price', e.target.value)}
                placeholder="0.00"
                className={inputCls}
                style={{ borderColor: 'var(--color-border)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Compare-at price (GH₵)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.comparePrice}
                onChange={e => setForm(f => ({ ...f, comparePrice: e.target.value }))}
                placeholder="0.00"
                className={inputCls}
                style={{ borderColor: 'var(--color-border)' }}
              />
            </div>
          </div>
        </div>

        {/* Inventory */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold mb-4 text-sm uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Inventory</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>SKU</label>
              <input
                value={form.sku}
                onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                placeholder="e.g. WS-WHT-42"
                className={inputCls}
                style={{ borderColor: 'var(--color-border)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Stock quantity</label>
              <input
                type="number"
                min="0"
                value={form.inventory}
                onChange={e => setForm(f => ({ ...f, inventory: e.target.value }))}
                className={inputCls}
                style={{ borderColor: 'var(--color-border)' }}
              />
            </div>
          </div>
        </div>

        {/* Organisation */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold mb-4 text-sm uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Organisation</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Category</label>
              <select
                value={form.categoryId}
                onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                className={inputCls}
                style={{ borderColor: 'var(--color-border)' }}
              >
                <option value="">— Uncategorised —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                className={inputCls}
                style={{ borderColor: 'var(--color-border)' }}
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold mb-4 text-sm uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Images</h2>
          {isEdit && product ? (
            <ImageUploader productId={product.id} />
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Save the product first, then upload images on the edit screen.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
            style={{ background: 'var(--color-primary)' }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {isEdit ? 'Save changes' : 'Create product'}
          </button>
          <Link
            href="/cms/products"
            className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-medium border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
