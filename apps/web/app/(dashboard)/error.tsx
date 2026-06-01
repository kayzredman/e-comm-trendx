'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Stethoscope } from 'lucide-react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[dashboard:error-boundary]', error)
  }, [error])

  return (
    <div className="flex-1 p-4 md:p-8 flex items-start justify-center">
      <div
        className="w-full max-w-2xl rounded-xl border p-6"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="p-2 rounded-lg shrink-0"
            style={{ background: '#FEF3C7', color: '#D97706' }}
          >
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              This page failed to render
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              The rest of the dashboard is still working. You can retry this view, or jump to
              Service Quality to see which subsystems are degraded.
            </p>
          </div>
        </div>

        <pre
          className="text-xs p-3 rounded-md overflow-x-auto mb-4 border"
          style={{
            background: '#F8FAFC',
            color: '#475569',
            borderColor: 'var(--color-border)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            maxHeight: 180,
          }}
        >
          {error.message}
          {error.digest ? `\n\ndigest: ${error.digest}` : ''}
        </pre>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-md text-white"
            style={{ background: '#2563EB' }}
          >
            <RefreshCw size={14} /> Retry
          </button>
          <Link
            href="/cms/service-quality"
            className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-md border"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
              background: 'var(--color-surface)',
            }}
          >
            <Stethoscope size={14} /> Service Quality
          </Link>
          <Link
            href="/cms"
            className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-md border"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
              background: 'var(--color-surface)',
            }}
          >
            Dashboard home
          </Link>
        </div>
      </div>
    </div>
  )
}
