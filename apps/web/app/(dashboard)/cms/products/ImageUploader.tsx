'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { imagesApi, uploadToPresignedUrl, type ProductImage } from '@/lib/api'
import { Loader2, Upload, X, Star, StarOff, Link2 } from 'lucide-react'

type Props = {
  productId: string
}

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']

type ItemState =
  | { kind: 'pending'; file: File; progress: number; phase: 'uploading' | 'processing' }
  | { kind: 'error'; file: File; error: string }
  | { kind: 'image'; image: ProductImage }

export default function ImageUploader({ productId }: Props) {
  const { getToken } = useAuth()
  const [items, setItems] = useState<ItemState[]>([])
  const [loading, setLoading] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [urlMode, setUrlMode] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const [urlSubmitting, setUrlSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    try {
      const list = await imagesApi.list(productId)
      setItems((prev) => {
        // keep any non-image (pending/error) entries; replace image entries.
        const pending = prev.filter((p) => p.kind !== 'image')
        return [...list.map<ItemState>((image) => ({ kind: 'image', image })), ...pending]
      })
    } catch (e) {
      console.error('list images failed', e)
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function uploadFile(file: File) {
    setGlobalError(null)
    if (!ACCEPT.includes(file.type)) {
      setItems((p) => [...p, { kind: 'error', file, error: 'Only JPG, PNG, or WebP allowed' }])
      return
    }
    if (file.size > MAX_BYTES) {
      setItems((p) => [...p, { kind: 'error', file, error: `Max ${Math.round(MAX_BYTES / 1024 / 1024)}MB` }])
      return
    }
    const placeholderIdx = (() => {
      let idx = -1
      setItems((p) => {
        idx = p.length
        return [...p, { kind: 'pending', file, progress: 0, phase: 'uploading' }]
      })
      return () => idx
    })()
    const getIdx = placeholderIdx

    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const presigned = await imagesApi.presign(
        { productId, contentType: file.type, size: file.size },
        token,
      )
      await uploadToPresignedUrl(presigned, file, (pct) => {
        setItems((p) => {
          const next = [...p]
          const i = getIdx()
          if (next[i]?.kind === 'pending') next[i] = { ...next[i], progress: pct } as ItemState
          return next
        })
      })
      setItems((p) => {
        const next = [...p]
        const i = getIdx()
        if (next[i]?.kind === 'pending') {
          next[i] = { kind: 'pending', file, progress: 100, phase: 'processing' }
        }
        return next
      })
      const freshToken = (await getToken()) ?? token
      const finalized = await imagesApi.finalize(
        { productId, tempKey: presigned.key, alt: file.name.replace(/\.[^.]+$/, '') },
        freshToken,
      )
      setItems((p) => {
        const next = p.filter((_, i) => i !== getIdx())
        return [...next, { kind: 'image', image: finalized }]
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload failed'
      setItems((p) => {
        const next = [...p]
        const i = getIdx()
        if (next[i]) next[i] = { kind: 'error', file, error: msg }
        return next
      })
    }
  }

  function onSelectFiles(files: FileList | File[] | null) {
    if (!files) return
    for (const f of Array.from(files)) void uploadFile(f)
  }

  async function deleteImage(id: string) {
    const token = await getToken()
    if (!token) return
    setItems((p) => p.filter((i) => !(i.kind === 'image' && i.image.id === id)))
    try {
      await imagesApi.delete(id, token)
      await refresh()
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : 'Delete failed')
      await refresh()
    }
  }

  async function setPrimary(id: string) {
    const token = await getToken()
    if (!token) return
    try {
      await imagesApi.patch(id, { isPrimary: true }, token)
      await refresh()
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : 'Update failed')
    }
  }

  async function updateAlt(id: string, alt: string) {
    const token = await getToken()
    if (!token) return
    try {
      await imagesApi.patch(id, { alt }, token)
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : 'Update failed')
    }
  }

  async function reorder(ids: string[]) {
    const token = await getToken()
    if (!token) return
    try {
      await imagesApi.reorder({ productId, ids }, token)
      await refresh()
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : 'Reorder failed')
    }
  }

  async function submitExternalUrl(e: React.FormEvent) {
    e.preventDefault()
    if (!urlValue.trim()) return
    setUrlSubmitting(true)
    setGlobalError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await imagesApi.addExternal({ productId, url: urlValue.trim() }, token)
      setUrlValue('')
      await refresh()
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : 'Failed to add URL')
    } finally {
      setUrlSubmitting(false)
    }
  }

  const imageItems = items.filter((i): i is Extract<ItemState, { kind: 'image' }> => i.kind === 'image')
  const pendingItems = items.filter((i) => i.kind !== 'image')

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          onSelectFiles(e.dataTransfer.files)
        }}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        className="rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition flex flex-col items-center text-center"
        style={{
          borderColor: dragOver ? 'var(--color-primary)' : 'var(--color-border)',
          background: dragOver ? 'rgba(30,64,175,0.04)' : 'transparent',
        }}
      >
        <Upload size={28} style={{ color: 'var(--color-text-muted)' }} />
        <p className="mt-2 text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Drop images here or click to browse
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          JPG, PNG, or WebP · up to {Math.round(MAX_BYTES / 1024 / 1024)}MB each
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT.join(',')}
          className="hidden"
          onChange={(e) => onSelectFiles(e.target.files)}
        />
      </div>

      {globalError && (
        <p className="px-3 py-2 rounded text-sm" style={{ background: '#FEF2F2', color: 'var(--color-error)' }}>
          {globalError}
        </p>
      )}

      {/* Grid of images + pending uploads */}
      {(imageItems.length > 0 || pendingItems.length > 0 || loading) && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          {loading && imageItems.length === 0 && pendingItems.length === 0 && (
            <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading images…</div>
          )}
          {imageItems.map((it, idx) => (
            <ImageTile
              key={it.image.id}
              image={it.image}
              canMoveUp={idx > 0}
              canMoveDown={idx < imageItems.length - 1}
              onMoveUp={() => {
                const ids = imageItems.map((i) => i.image.id)
                ;[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
                void reorder(ids)
              }}
              onMoveDown={() => {
                const ids = imageItems.map((i) => i.image.id)
                ;[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
                void reorder(ids)
              }}
              onDelete={() => deleteImage(it.image.id)}
              onSetPrimary={() => setPrimary(it.image.id)}
              onAltBlur={(alt) => updateAlt(it.image.id, alt)}
            />
          ))}
          {pendingItems.map((it, idx) => (
            <PendingTile key={`pending-${idx}`} item={it} onDismiss={() => {
              setItems((p) => p.filter((x) => x !== it))
            }} />
          ))}
        </div>
      )}

      {/* External URL */}
      <div>
        <button
          type="button"
          onClick={() => setUrlMode((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Link2 size={12} /> {urlMode ? 'Hide URL input' : 'Advanced: add by URL'}
        </button>
        {urlMode && (
          <form onSubmit={submitExternalUrl} className="flex gap-2 mt-2">
            <input
              type="url"
              required
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: 'var(--color-border)' }}
            />
            <button
              type="submit"
              disabled={urlSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'var(--color-primary)' }}
            >
              {urlSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function ImageTile({
  image,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDelete,
  onSetPrimary,
  onAltBlur,
}: {
  image: ProductImage
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  onSetPrimary: () => void
  onAltBlur: (alt: string) => void
}) {
  const [alt, setAlt] = useState(image.alt ?? '')
  useEffect(() => { setAlt(image.alt ?? '') }, [image.alt])
  const url = image.urls.grid ?? image.urls.detail ?? image.url ?? ''
  return (
    <div className="rounded-xl border overflow-hidden group relative" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      <div className="relative aspect-square w-full bg-gray-100">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={alt} className="w-full h-full object-cover" />
        ) : null}
        {image.isPrimary && (
          <span
            className="absolute top-1.5 left-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            Primary
          </span>
        )}
        {image.source === 'external' && (
          <span
            className="absolute bottom-1.5 left-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--color-text-muted)' }}
          >
            URL
          </span>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-end justify-end p-1.5 gap-1">
          <button
            type="button"
            onClick={onSetPrimary}
            disabled={image.isPrimary}
            title={image.isPrimary ? 'Already primary' : 'Set as primary'}
            className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition disabled:opacity-40"
            style={{ background: 'white', color: 'var(--color-text)' }}
          >
            {image.isPrimary ? <Star size={12} fill="currentColor" /> : <StarOff size={12} />}
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete"
            className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition"
            style={{ background: 'white', color: 'var(--color-error)' }}
          >
            <X size={12} />
          </button>
        </div>
      </div>
      <div className="p-2 flex items-center gap-1">
        <input
          type="text"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          onBlur={() => { if (alt !== (image.alt ?? '')) onAltBlur(alt) }}
          placeholder="Alt text"
          className="flex-1 text-xs px-1.5 py-1 rounded border outline-none focus:ring-1 focus:ring-blue-500"
          style={{ borderColor: 'var(--color-border)' }}
        />
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="text-xs px-1 disabled:opacity-30"
          title="Move left"
        >◀</button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="text-xs px-1 disabled:opacity-30"
          title="Move right"
        >▶</button>
      </div>
    </div>
  )
}

function PendingTile({ item, onDismiss }: { item: ItemState; onDismiss: () => void }) {
  if (item.kind === 'image') return null
  return (
    <div
      className="rounded-xl border overflow-hidden flex flex-col aspect-square items-center justify-center p-3"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      {item.kind === 'pending' ? (
        <>
          <Loader2 className="animate-spin" size={20} style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-xs mt-2 font-medium truncate w-full text-center" style={{ color: 'var(--color-text)' }}>
            {item.file.name}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {item.phase === 'uploading' ? `Uploading ${item.progress}%` : 'Processing…'}
          </p>
        </>
      ) : (
        <>
          <X size={20} style={{ color: 'var(--color-error)' }} />
          <p className="text-xs mt-2 font-medium truncate w-full text-center" style={{ color: 'var(--color-text)' }}>
            {item.file.name}
          </p>
          <p className="text-[10px] mt-0.5 text-center" style={{ color: 'var(--color-error)' }}>
            {item.error}
          </p>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[10px] mt-1 underline"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Dismiss
          </button>
        </>
      )}
    </div>
  )
}
