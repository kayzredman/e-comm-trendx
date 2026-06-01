'use client'

import { useMemo, useState, useTransition } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Check, EyeOff, RotateCcw, Trash2, Star, Loader2 } from 'lucide-react'
import { reviewsAdminApi, type ReviewRow } from '@/lib/api'

type Status = 'ALL' | 'PENDING' | 'PUBLISHED' | 'HIDDEN'

const STATUS_STYLE: Record<ReviewRow['status'], { bg: string; color: string; label: string }> = {
  PENDING:   { bg: '#FEF9C3', color: '#CA8A04', label: 'Pending' },
  PUBLISHED: { bg: '#DCFCE7', color: '#16A34A', label: 'Live' },
  HIDDEN:    { bg: '#E2E8F0', color: '#475569', label: 'Hidden' },
}

export default function ReviewsModerationClient({ initialReviews }: { initialReviews: ReviewRow[] }) {
  const [reviews, setReviews] = useState<ReviewRow[]>(initialReviews)
  const [filter, setFilter] = useState<Status>('PENDING')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { getToken } = useAuth()
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => {
    if (filter === 'ALL') return reviews
    return reviews.filter((r) => r.status === filter)
  }, [reviews, filter])

  async function act(id: string, action: 'publish' | 'hide' | 'pending' | 'delete') {
    setBusy(id)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not signed in')
      if (action === 'delete') {
        await reviewsAdminApi.remove(id, token)
        setReviews((rs) => rs.filter((r) => r.id !== id))
      } else {
        const status =
          action === 'publish' ? 'PUBLISHED'
          : action === 'hide' ? 'HIDDEN'
          : 'PENDING'
        const updated = await reviewsAdminApi.setStatus(id, status, token)
        setReviews((rs) => rs.map((r) => (r.id === id ? { ...r, status: updated.status } : r)))
      }
    } catch (err) {
      const e = err as { body?: { message?: string }; message?: string }
      setError(e?.body?.message ?? e?.message ?? 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['PENDING', 'PUBLISHED', 'HIDDEN', 'ALL'] as Status[]).map((s) => {
          const active = filter === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => startTransition(() => setFilter(s))}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors"
              style={
                active
                  ? { background: '#2563EB', color: 'white', borderColor: '#2563EB' }
                  : { background: 'white', color: '#475569', borderColor: '#E2E8F0' }
              }
            >
              {s === 'ALL' ? 'All' : STATUS_STYLE[s].label}
            </button>
          )
        })}
      </div>

      {error && (
        <div
          className="text-sm px-3 py-2 rounded-lg"
          style={{ background: '#FEE2E2', color: '#991B1B' }}
        >
          {error}
        </div>
      )}

      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'white', borderColor: '#E2E8F0' }}
      >
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm" style={{ color: '#64748B' }}>
            No reviews in this view.
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: '#E2E8F0' }}>
            {filtered.map((r) => {
              const style = STATUS_STYLE[r.status]
              return (
                <li key={r.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            size={14}
                            strokeWidth={1.5}
                            fill={n <= r.rating ? '#F97316' : 'transparent'}
                            color="#F97316"
                          />
                        ))}
                      </div>
                      {r.title && (
                        <span className="font-bold text-sm" style={{ color: '#0F172A' }}>
                          {r.title}
                        </span>
                      )}
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
                        style={{ background: style.bg, color: style.color }}
                      >
                        {style.label}
                      </span>
                    </div>
                    <time className="text-xs" style={{ color: '#64748B' }}>
                      {new Date(r.createdAt).toLocaleString()}
                    </time>
                  </div>

                  {r.body && (
                    <p className="text-sm leading-relaxed mb-3" style={{ color: '#0F172A' }}>
                      {r.body}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1" style={{ color: '#64748B' }}>
                      <span>
                        <strong style={{ color: '#0F172A' }}>{r.customer?.name ?? 'Unknown buyer'}</strong>
                        {r.customer?.email ? ` · ${r.customer.email}` : ''}
                      </span>
                      {r.product && (
                        <span>
                          on{' '}
                          <a
                            href={`/products/${r.product.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold underline"
                            style={{ color: '#2563EB' }}
                          >
                            {r.product.name}
                          </a>
                        </span>
                      )}
                      {r.orderId && (
                        <span className="font-mono tabular-nums">
                          order {r.orderId.slice(0, 8).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {r.status !== 'PUBLISHED' && (
                        <ActionBtn
                          onClick={() => act(r.id, 'publish')}
                          loading={busy === r.id}
                          icon={<Check size={13} />}
                          label="Publish"
                          color="#16A34A"
                        />
                      )}
                      {r.status !== 'HIDDEN' && (
                        <ActionBtn
                          onClick={() => act(r.id, 'hide')}
                          loading={busy === r.id}
                          icon={<EyeOff size={13} />}
                          label="Hide"
                          color="#475569"
                        />
                      )}
                      {r.status !== 'PENDING' && (
                        <ActionBtn
                          onClick={() => act(r.id, 'pending')}
                          loading={busy === r.id}
                          icon={<RotateCcw size={13} />}
                          label="Re-queue"
                          color="#CA8A04"
                        />
                      )}
                      <ActionBtn
                        onClick={() => {
                          if (window.confirm('Delete this review permanently?')) {
                            void act(r.id, 'delete')
                          }
                        }}
                        loading={busy === r.id}
                        icon={<Trash2 size={13} />}
                        label="Delete"
                        color="#DC2626"
                      />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function ActionBtn({
  onClick,
  loading,
  icon,
  label,
  color,
}: {
  onClick: () => void
  loading: boolean
  icon: React.ReactNode
  label: string
  color: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold border text-xs disabled:opacity-60"
      style={{ borderColor: color, color }}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : icon}
      {label}
    </button>
  )
}
