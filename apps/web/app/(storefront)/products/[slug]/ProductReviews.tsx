'use client'

import { useEffect, useState, useTransition } from 'react'
import { Star, CheckCircle2, X, Loader2, MessageSquare } from 'lucide-react'
import { reviewsApi, type ReviewRow, type ReviewSummary } from '@/lib/api'

type Props = {
  productId: string
  productName: string
}

function Stars({ value, size = 16, color = '#F97316' }: { value: number; size?: number; color?: string }) {
  const full = Math.round(value)
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          strokeWidth={1.5}
          fill={n <= full ? color : 'transparent'}
          color={color}
        />
      ))}
    </div>
  )
}

export default function ProductReviews({ productId, productName }: Props) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null)
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  async function reload() {
    setLoading(true)
    try {
      const [s, r] = await Promise.all([
        reviewsApi.summary(productId),
        reviewsApi.listForProduct(productId),
      ])
      setSummary(s)
      setReviews(r)
    } catch {
      setSummary({ count: 0, avg: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } })
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  return (
    <section
      className="rounded-2xl border p-6 sm:p-8 mt-10"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2
            className="text-xl sm:text-2xl font-extrabold mb-1"
            style={{ color: 'var(--color-text)' }}
          >
            Customer reviews
          </h2>
          {summary && summary.count > 0 ? (
            <div className="flex items-center gap-2 text-sm">
              <Stars value={summary.avg} />
              <span className="font-mono tabular-nums font-semibold" style={{ color: 'var(--color-text)' }}>
                {summary.avg.toFixed(1)}
              </span>
              <span style={{ color: 'var(--color-text-muted)' }}>
                · {summary.count} {summary.count === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Be the first to share your experience.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm"
          style={{ background: '#F97316' }}
        >
          <MessageSquare size={16} /> Write a review
        </button>
      </header>

      {summary && summary.count > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-[200px,1fr] gap-6 mb-6">
          {/* Distribution bars */}
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = summary.distribution[star as 1 | 2 | 3 | 4 | 5] ?? 0
              const pct = summary.count > 0 ? Math.round((n / summary.count) * 100) : 0
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 font-semibold tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                    {star}
                  </span>
                  <Star size={12} fill="#F97316" color="#F97316" strokeWidth={1.5} />
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ background: '#E2E8F0' }}
                  >
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#F97316' }} />
                  </div>
                  <span
                    className="w-8 text-right font-mono tabular-nums"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {n}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm py-6" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={16} className="animate-spin" /> Loading reviews…
        </div>
      ) : reviews && reviews.length > 0 ? (
        <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {reviews.map((r) => (
            <li key={r.id} className="py-5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3 mb-2">
                <Stars value={r.rating} size={14} />
                {r.title && (
                  <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                    {r.title}
                  </span>
                )}
              </div>
              {r.body && (
                <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--color-text)' }}>
                  {r.body}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <span className="font-semibold">{r.customer?.name ?? 'Verified buyer'}</span>
                {r.orderId && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold"
                    style={{ background: '#DCFCE7', color: '#16A34A' }}>
                    <CheckCircle2 size={10} /> Verified
                  </span>
                )}
                <span>·</span>
                <time>{new Date(r.createdAt).toLocaleDateString()}</time>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm py-6" style={{ color: 'var(--color-text-muted)' }}>
          No reviews yet.
        </p>
      )}

      {showForm && (
        <ReviewForm
          productId={productId}
          productName={productName}
          onClose={() => setShowForm(false)}
          onSubmitted={() => {
            setShowForm(false)
            void reload()
          }}
        />
      )}
    </section>
  )
}

function ReviewForm({
  productId,
  productName,
  onClose,
  onSubmitted,
}: {
  productId: string
  productName: string
  onClose: () => void
  onSubmitted: () => void
}) {
  const [orderId, setOrderId] = useState('')
  const [email, setEmail] = useState('')
  const [rating, setRating] = useState(5)
  const [hover, setHover] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await reviewsApi.submit({
          productId,
          orderId: orderId.trim(),
          email: email.trim(),
          rating,
          title: title.trim() || undefined,
          body: body.trim() || undefined,
        })
        setSuccess(true)
        setTimeout(onSubmitted, 1400)
      } catch (err) {
        const e = err as { body?: { message?: string }; message?: string }
        setError(e?.body?.message ?? e?.message ?? 'Failed to submit review')
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(15, 23, 42, 0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl"
        style={{ background: 'var(--color-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h3 className="font-extrabold" style={{ color: 'var(--color-text)' }}>
            Write a review
          </h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        {success ? (
          <div className="p-8 text-center">
            <CheckCircle2 size={48} className="mx-auto mb-3" style={{ color: '#16A34A' }} />
            <p className="font-bold" style={{ color: 'var(--color-text)' }}>
              Thank you!
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Your review is awaiting moderation and will appear shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-4">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Reviewing <strong style={{ color: 'var(--color-text)' }}>{productName}</strong>. We verify reviews using
              your order ID and the email you used at checkout.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Order ID" htmlFor="rv-order">
                <input
                  id="rv-order"
                  type="text"
                  required
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-page)' }}
                  placeholder="e.g. abcd1234…"
                />
              </Field>
              <Field label="Email at checkout" htmlFor="rv-email">
                <input
                  id="rv-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-page)' }}
                  placeholder="you@example.com"
                />
              </Field>
            </div>

            <Field label="Your rating" htmlFor="rv-rating">
              <div id="rv-rating" className="inline-flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} star${n === 1 ? '' : 's'}`}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(n)}
                    className="p-1"
                  >
                    <Star
                      size={28}
                      strokeWidth={1.5}
                      fill={(hover || rating) >= n ? '#F97316' : 'transparent'}
                      color="#F97316"
                    />
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Title (optional)" htmlFor="rv-title">
              <input
                id="rv-title"
                type="text"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-page)' }}
                placeholder="Sum it up"
              />
            </Field>

            <Field label="Your review (optional)" htmlFor="rv-body">
              <textarea
                id="rv-body"
                rows={4}
                maxLength={2000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm leading-relaxed resize-none"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-page)' }}
                placeholder="What did you love? Anything you'd improve?"
              />
            </Field>

            {error && (
              <div
                className="text-sm px-3 py-2 rounded-lg"
                style={{ background: '#FEE2E2', color: '#991B1B' }}
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg font-semibold text-sm"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-white text-sm disabled:opacity-60"
                style={{ background: '#2563EB' }}
              >
                {pending && <Loader2 size={14} className="animate-spin" />}
                Submit review
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      {children}
    </label>
  )
}
