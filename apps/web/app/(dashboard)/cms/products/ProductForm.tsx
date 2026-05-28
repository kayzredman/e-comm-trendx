'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { productsApi, imagesApi, variantsApi, uploadToPresignedUrl, type Category, type ProductInput, type ProductImage, type ProductVariant, type ProductVariantInput } from '@/lib/api'
import { resolveProductImage } from '@/lib/api'
import { slugify, formatPrice } from '@/lib/utils'
import { Loader2, ArrowLeft, Package, Tag, Hash, Layers, ImageIcon, CheckCircle2, X, Upload, Plus, Trash2, Sparkles, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ImageUploader from './ImageUploader'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

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
    imageAssets?: ProductImage[]
    variants?: ProductVariant[]
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
  /** Files queued during create flow — uploaded after the product is created. */
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [variants, setVariants] = useState<VariantDraft[]>(
    () => (product?.variants ?? []).map(toDraft),
  )

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
        const freshV = (await getToken()) ?? token
        await variantsApi.replaceAll(product.id, variants.map(fromDraft), freshV)
      } else {
        const created = await productsApi.create(payload, token) as { id: string }
        // Upload any queued images now that we have a product ID
        if (pendingFiles.length > 0) {
          for (let i = 0; i < pendingFiles.length; i++) {
            const f = pendingFiles[i]
            setUploadStatus(`Uploading image ${i + 1} of ${pendingFiles.length}…`)
            try {
              const fresh = (await getToken()) ?? token
              const presigned = await imagesApi.presign(
                { productId: created.id, contentType: f.type, size: f.size },
                fresh,
              )
              await uploadToPresignedUrl(presigned, f)
              const fresh2 = (await getToken()) ?? token
              await imagesApi.finalize(
                { productId: created.id, tempKey: presigned.key, alt: f.name.replace(/\.[^.]+$/, '') },
                fresh2,
              )
            } catch (uploadErr) {
              console.error('Image upload failed', uploadErr)
            }
          }
          setUploadStatus(null)
        }
        if (variants.length > 0) {
          setUploadStatus('Saving variants…')
          const freshV = (await getToken()) ?? token
          await variantsApi.replaceAll(created.id, variants.map(fromDraft), freshV)
          setUploadStatus(null)
        }
      }

      router.push('/cms/products')
      router.refresh()
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const STATUS_STYLE: Record<string, { label: string; bg: string; color: string; ring: string }> = {
    ACTIVE:   { label: 'Active',   bg: '#DCFCE7', color: '#16A34A', ring: '#BBF7D0' },
    DRAFT:    { label: 'Draft',    bg: '#FEF9C3', color: '#CA8A04', ring: '#FDE68A' },
    ARCHIVED: { label: 'Archived', bg: '#F1F5F9', color: '#475569', ring: '#E2E8F0' },
  }
  const statusStyle = STATUS_STYLE[form.status] ?? STATUS_STYLE.DRAFT
  const hero = isEdit && product ? resolveProductImage(product as any, 'detail') : null
  const categoryName = categories.find(c => c.id === form.categoryId)?.name ?? 'Uncategorised'
  const stockNum = parseInt(form.inventory, 10) || 0
  const stockTone = stockNum === 0
    ? { bg: '#FEE2E2', color: '#DC2626' }
    : stockNum < 10
      ? { bg: '#FEF3C7', color: '#D97706' }
      : { bg: '#DCFCE7', color: '#16A34A' }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-28">
      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <Link
          href="/cms/products"
          className="inline-flex items-center gap-2 text-sm font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft size={16} /> All products
        </Link>
        {isEdit && (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
            style={{ background: statusStyle.bg, color: statusStyle.color, borderColor: statusStyle.ring }}
          >
            <CheckCircle2 size={12} /> {statusStyle.label}
          </span>
        )}
      </div>

      {error && (
        <div
          className="rounded-xl border px-4 py-3 mb-5 flex items-start gap-2"
          style={{ background: '#FEF2F2', borderColor: '#FECACA', color: 'var(--color-error)' }}
        >
          <X size={16} className="mt-0.5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* ── Hero card ──────────────────────────────────── */}
      <div
        className="rounded-2xl border p-5 md:p-6 mb-5"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: '0 1px 3px rgba(0,0,0,.04)',
        }}
      >
        <div className="flex flex-col md:flex-row gap-5 md:gap-6">
          {/* Image preview */}
          <div
            className="relative w-full md:w-44 h-44 rounded-xl overflow-hidden flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
              border: '1px solid var(--color-border)',
            }}
          >
            {hero ? (
              <Image
                src={hero.url}
                alt={hero.alt ?? form.name}
                fill
                sizes="176px"
                className="object-cover"
                placeholder={hero.blurDataUrl ? 'blur' : 'empty'}
                blurDataURL={hero.blurDataUrl}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ color: 'var(--color-text-subtle)' }}>
                <ImageIcon size={36} />
                <p className="text-xs font-medium">No image yet</p>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-subtle)' }}>
              {isEdit ? 'Editing product' : 'New product'}
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2 truncate" style={{ color: 'var(--color-text)' }}>
              {form.name || (isEdit ? product!.name : 'Untitled product')}
            </h1>
            {form.slug && (
              <p className="text-sm mb-4 truncate" style={{ color: 'var(--color-text-muted)' }}>
                /{form.slug}
              </p>
            )}

            {/* Stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatTile
                icon={<Tag size={14} />}
                label="Price"
                value={form.price ? formatPrice(form.price) : '—'}
                accent="#2563EB"
              />
              <StatTile
                icon={<Package size={14} />}
                label="Stock"
                value={String(stockNum)}
                accent={stockTone.color}
                bg={stockTone.bg}
              />
              <StatTile
                icon={<Layers size={14} />}
                label="Category"
                value={categoryName}
                accent="#7C3AED"
              />
              <StatTile
                icon={<Hash size={14} />}
                label="SKU"
                value={form.sku || '—'}
                accent="#475569"
              />
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} id="product-form">
        {/* ── Two-column layout ───────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Left column — main form */}
          <div className="lg:col-span-2 space-y-5">
            <SectionCard title="Basic info" subtitle="Name, slug and description shown to shoppers.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" required>
                  <input
                    required
                    value={form.name}
                    onChange={e => setField('name', e.target.value)}
                    placeholder="e.g. Classic White Sneakers"
                    className={inputCls}
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                </Field>
                <Field label="Slug">
                  <input
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                    placeholder="auto-generated"
                    className={inputCls}
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Description">
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Tell shoppers what makes this product special..."
                    className={inputCls}
                    style={{ borderColor: 'var(--color-border)', resize: 'vertical' }}
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="Pricing" subtitle="Set the selling price and an optional compare-at price for sales.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Price (GH₵)" required>
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
                </Field>
                <Field label="Compare-at price (GH₵)" hint="Shown struck-through to indicate a discount.">
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
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              title="Variants"
              subtitle={
                variants.length > 0
                  ? `${variants.length} variant${variants.length === 1 ? '' : 's'} — variant stock & price override the product-level fields.`
                  : 'Optional. Add sizes, colours, or any other axis shoppers can pick from.'
              }
            >
              <VariantsEditor variants={variants} onChange={setVariants} basePrice={form.price} />
            </SectionCard>

            <SectionCard title="Images" subtitle="Drag to reorder. First image is the primary shown on cards.">
              {isEdit && product ? (
                <ImageUploader productId={product.id} />
              ) : (
                <PendingImagePicker
                  files={pendingFiles}
                  onChange={setPendingFiles}
                  onError={setError}
                />
              )}
            </SectionCard>
          </div>

          {/* Right column — sidebar */}
          <div className="space-y-5">
            <SectionCard title="Status">
              <div className="space-y-2">
                {(['ACTIVE', 'DRAFT', 'ARCHIVED'] as const).map((s) => {
                  const st = STATUS_STYLE[s]
                  const active = form.status === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, status: s }))}
                      className="w-full text-left px-3 py-2.5 rounded-lg border transition-all flex items-center justify-between"
                      style={{
                        background: active ? st.bg : 'var(--color-surface)',
                        borderColor: active ? st.color : 'var(--color-border)',
                        color: active ? st.color : 'var(--color-text)',
                        boxShadow: active ? `0 0 0 2px ${st.ring}` : 'none',
                      }}
                    >
                      <span className="text-sm font-semibold">{st.label}</span>
                      {active && <CheckCircle2 size={14} />}
                    </button>
                  )
                })}
              </div>
            </SectionCard>

            <SectionCard title="Organisation">
              <Field label="Category">
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
              </Field>
            </SectionCard>

            <SectionCard title="Inventory">
              <Field label="SKU">
                <input
                  value={form.sku}
                  onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                  placeholder="e.g. WS-WHT-42"
                  className={inputCls}
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </Field>
              <div className="mt-4">
                <Field label="Stock quantity">
                  <input
                    type="number"
                    min="0"
                    value={form.inventory}
                    onChange={e => setForm(f => ({ ...f, inventory: e.target.value }))}
                    className={inputCls}
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                </Field>
              </div>
              {variants.length > 0 && (
                <div
                  className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[11px]"
                  style={{ background: '#FEF3C7', color: '#92400E' }}
                >
                  <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                  <span>
                    This product has {variants.length} variant{variants.length === 1 ? '' : 's'}. The
                    stock and price above are ignored — variant rows take over.
                  </span>
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </form>

      {/* ── Sticky action bar ───────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 lg:left-[260px] z-30 border-t backdrop-blur-md"
        style={{
          background: 'rgba(255,255,255,.92)',
          borderColor: 'var(--color-border)',
          boxShadow: '0 -4px 12px rgba(0,0,0,.04)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-3">
          <p className="text-xs hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
            {uploadStatus
              ? uploadStatus
              : isEdit
                ? 'Changes save to the live product.'
                : pendingFiles.length > 0
                  ? `${pendingFiles.length} image${pendingFiles.length === 1 ? '' : 's'} will upload after create.`
                  : 'Saving will create a new product.'}
          </p>
          <div className="flex gap-2 ml-auto">
            <Link
              href="/cms/products"
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', background: 'var(--color-surface)' }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              form="product-form"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-all hover:scale-[1.02] disabled:hover:scale-100"
              style={{ background: 'var(--color-primary)', boxShadow: '0 2px 6px rgba(37,99,235,.25)' }}
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {isEdit ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Helper components ─────────────────────────── */

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        boxShadow: '0 1px 3px rgba(0,0,0,.04)',
      }}
    >
      <div className="mb-4">
        <h2 className="text-sm font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{title}</h2>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        {label} {required && <span style={{ color: 'var(--color-error)' }}>*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-subtle)' }}>{hint}</p>
      )}
    </div>
  )
}

function StatTile({ icon, label, value, accent, bg }: { icon: React.ReactNode; label: string; value: string; accent: string; bg?: string }) {
  return (
    <div
      className="rounded-xl border px-3 py-2.5 min-w-0"
      style={{
        background: bg ?? 'var(--color-surface-muted)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-1" style={{ color: accent }}>
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }} title={value}>
        {value}
      </p>
    </div>
  )
}

/**
 * Lightweight picker used on the *create* product screen. We can't upload yet
 * (no product ID exists), so files are queued in state and uploaded by
 * ProductForm right after the create call returns.
 */
function PendingImagePicker({
  files,
  onChange,
  onError,
}: {
  files: File[]
  onChange: (next: File[]) => void
  onError: (msg: string) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(list: FileList | File[] | null) {
    if (!list) return
    const incoming = Array.from(list)
    const accepted: File[] = []
    for (const f of incoming) {
      if (!ALLOWED_MIME.includes(f.type)) {
        onError(`${f.name}: only JPG, PNG, or WebP.`)
        continue
      }
      if (f.size > MAX_BYTES) {
        onError(`${f.name}: max 10MB.`)
        continue
      }
      accepted.push(f)
    }
    if (accepted.length === 0) return
    onChange([...files, ...accepted])
  }

  function removeAt(idx: number) {
    onChange(files.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          addFiles(e.dataTransfer.files)
        }}
        className="rounded-xl border-2 border-dashed px-5 py-8 text-center cursor-pointer transition-colors"
        style={{
          borderColor: dragOver ? 'var(--color-primary)' : 'var(--color-border)',
          background: dragOver ? 'rgba(37,99,235,.04)' : 'var(--color-surface-muted)',
        }}
      >
        <Upload size={28} className="mx-auto mb-2" style={{ color: dragOver ? 'var(--color-primary)' : 'var(--color-text-subtle)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Drop images or click to browse
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>
          They'll upload automatically after the product is created.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_MIME.join(',')}
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
          {files.map((f, i) => (
            <PendingTile key={`${f.name}-${i}`} file={f} onRemove={() => removeAt(i)} />
          ))}
        </div>
      )}
    </div>
  )
}

function PendingTile({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string>('')
  useEffect(() => {
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return (
    <div
      className="relative aspect-square rounded-xl overflow-hidden border group"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={file.name} className="w-full h-full object-cover" />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(0,0,0,.55)', color: '#fff' }}
        title="Remove"
      >
        <X size={14} />
      </button>
      <div
        className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px] font-semibold truncate"
        style={{ background: 'rgba(15,23,42,.6)', color: '#fff' }}
        title={file.name}
      >
        {file.name}
      </div>
    </div>
  )
}

/* ── Variants editor ───────────────────────────── */

type VariantDraft = {
  /** Server-assigned id; undefined for newly-added rows. */
  id?: string
  size: string
  color: string
  colorHex: string
  sku: string
  priceOverride: string
  inventory: string
  isActive: boolean
}

function toDraft(v: ProductVariant): VariantDraft {
  return {
    id: v.id,
    size: v.size ?? '',
    color: v.color ?? '',
    colorHex: v.colorHex ?? '',
    sku: v.sku ?? '',
    priceOverride: v.priceOverride ?? '',
    inventory: String(v.inventory ?? 0),
    isActive: v.isActive,
  }
}

function fromDraft(d: VariantDraft, idx: number): ProductVariantInput {
  return {
    id: d.id,
    size: d.size.trim() || null,
    color: d.color.trim() || null,
    colorHex: d.colorHex.trim() || null,
    sku: d.sku.trim() || null,
    priceOverride: d.priceOverride.trim() ? d.priceOverride.trim() : null,
    inventory: parseInt(d.inventory, 10) || 0,
    sortOrder: idx,
    isActive: d.isActive,
  }
}

function emptyDraft(): VariantDraft {
  return { size: '', color: '', colorHex: '', sku: '', priceOverride: '', inventory: '0', isActive: true }
}

function VariantsEditor({
  variants,
  onChange,
  basePrice,
}: {
  variants: VariantDraft[]
  onChange: (next: VariantDraft[]) => void
  basePrice: string
}) {
  const [showGenerator, setShowGenerator] = useState(false)

  function update(i: number, patch: Partial<VariantDraft>) {
    onChange(variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)))
  }
  function remove(i: number) {
    onChange(variants.filter((_, idx) => idx !== i))
  }
  function add() {
    onChange([...variants, emptyDraft()])
  }

  if (variants.length === 0 && !showGenerator) {
    return (
      <div
        className="rounded-xl border-2 border-dashed px-5 py-8 text-center"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}
      >
        <Layers size={28} className="mx-auto mb-2" style={{ color: 'var(--color-text-subtle)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          No variants yet
        </p>
        <p className="text-xs mt-1 mb-4" style={{ color: 'var(--color-text-subtle)' }}>
          Add sizes, colours, or any combination. Skip if this product is sold as a single SKU.
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
          >
            <Plus size={13} /> Add one variant
          </button>
          <button
            type="button"
            onClick={() => setShowGenerator(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <Sparkles size={13} /> Bulk generate (sizes × colours)
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {showGenerator && (
        <BulkGenerator
          onCancel={() => setShowGenerator(false)}
          onGenerate={(rows) => {
            onChange([...variants, ...rows])
            setShowGenerator(false)
          }}
        />
      )}

      {variants.length > 0 && (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ color: 'var(--color-text-muted)' }}>
                {['Size', 'Color', 'Hex', 'SKU', `Price (${basePrice ? 'override' : 'GH₵'})`, 'Stock', 'Active', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left text-[10px] font-bold uppercase tracking-wider pb-2 pr-2"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {variants.map((v, i) => (
                <tr key={v.id ?? `new-${i}`} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td className="py-2 pr-2">
                    <input
                      value={v.size}
                      onChange={(e) => update(i, { size: e.target.value })}
                      placeholder="M"
                      className="w-20 rounded-md border px-2 py-1.5 text-sm"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={v.color}
                      onChange={(e) => update(i, { color: e.target.value })}
                      placeholder="Black"
                      className="w-28 rounded-md border px-2 py-1.5 text-sm"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={v.colorHex || '#000000'}
                        onChange={(e) => update(i, { colorHex: e.target.value })}
                        className="w-8 h-8 rounded-md border cursor-pointer"
                        style={{ borderColor: 'var(--color-border)', padding: 0 }}
                        title="Swatch colour"
                      />
                      <input
                        value={v.colorHex}
                        onChange={(e) => update(i, { colorHex: e.target.value })}
                        placeholder="#000000"
                        className="w-24 rounded-md border px-2 py-1.5 text-xs font-mono"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                    </div>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={v.sku}
                      onChange={(e) => update(i, { sku: e.target.value })}
                      placeholder="auto"
                      className="w-32 rounded-md border px-2 py-1.5 text-sm font-mono"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={v.priceOverride}
                      onChange={(e) => update(i, { priceOverride: e.target.value })}
                      placeholder={basePrice || '—'}
                      className="w-24 rounded-md border px-2 py-1.5 text-sm"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min="0"
                      value={v.inventory}
                      onChange={(e) => update(i, { inventory: e.target.value })}
                      className="w-20 rounded-md border px-2 py-1.5 text-sm"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <button
                      type="button"
                      onClick={() => update(i, { isActive: !v.isActive })}
                      className="relative w-10 h-6 rounded-full transition-colors"
                      style={{ background: v.isActive ? 'var(--color-primary)' : '#CBD5E1' }}
                      title={v.isActive ? 'Active' : 'Disabled'}
                    >
                      <span
                        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                        style={{ left: v.isActive ? '18px' : '2px' }}
                      />
                    </button>
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="p-1.5 rounded-md hover:bg-red-50 transition-colors"
                      style={{ color: 'var(--color-error)' }}
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-2 mt-4 flex-wrap">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          <Plus size={13} /> Add variant
        </button>
        {!showGenerator && (
          <button
            type="button"
            onClick={() => setShowGenerator(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
          >
            <Sparkles size={13} /> Bulk add
          </button>
        )}
      </div>
    </div>
  )
}

function BulkGenerator({
  onCancel,
  onGenerate,
}: {
  onCancel: () => void
  onGenerate: (rows: VariantDraft[]) => void
}) {
  const [sizes, setSizes] = useState('S, M, L, XL')
  const [colors, setColors] = useState('Black:#111111, White:#FFFFFF')
  const [inventory, setInventory] = useState('0')

  function parseColors(raw: string): Array<{ name: string; hex: string }> {
    return raw
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const [name, hex] = c.split(':').map((s) => s.trim())
        return { name: name ?? '', hex: hex ?? '' }
      })
  }
  function parseSizes(raw: string): string[] {
    return raw.split(',').map((s) => s.trim()).filter(Boolean)
  }

  const sizeList = parseSizes(sizes)
  const colorList = parseColors(colors)
  const count = Math.max(sizeList.length, 1) * Math.max(colorList.length, 1)

  function generate() {
    const rows: VariantDraft[] = []
    const sList = sizeList.length ? sizeList : ['']
    const cList = colorList.length ? colorList : [{ name: '', hex: '' }]
    for (const c of cList) {
      for (const s of sList) {
        rows.push({
          size: s,
          color: c.name,
          colorHex: c.hex,
          sku: '',
          priceOverride: '',
          inventory: inventory || '0',
          isActive: true,
        })
      }
    }
    onGenerate(rows)
  }

  return (
    <div
      className="rounded-xl border p-4 mb-4"
      style={{ background: 'var(--color-surface-muted)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
          <Sparkles size={14} className="inline mr-1.5" style={{ color: 'var(--color-primary)' }} />
          Bulk generate variants
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-md hover:bg-white"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <X size={14} />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Sizes (comma-separated)
          </span>
          <input
            value={sizes}
            onChange={(e) => setSizes(e.target.value)}
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-border)' }}
            placeholder="S, M, L, XL"
          />
        </label>
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Colours (Name:#hex, …)
          </span>
          <input
            value={colors}
            onChange={(e) => setColors(e.target.value)}
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-border)' }}
            placeholder="Black:#111, White:#fff"
          />
        </label>
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Stock per row
          </span>
          <input
            type="number"
            min="0"
            value={inventory}
            onChange={(e) => setInventory(e.target.value)}
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-border)' }}
          />
        </label>
      </div>
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Will create <strong>{count}</strong> variant{count === 1 ? '' : 's'}.
        </p>
        <button
          type="button"
          onClick={generate}
          disabled={count === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}
        >
          Generate
        </button>
      </div>
    </div>
  )
}
