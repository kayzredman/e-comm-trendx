'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, Stethoscope, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { healthApi, type HealthReport } from '@/lib/api'

export default function ServiceQualityError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { getToken } = useAuth()
  const [report, setReport] = useState<HealthReport | null>(null)
  const [fetchErr, setFetchErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[service-quality:error-boundary]', error)
    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        if (!token) {
          if (!cancelled) {
            setFetchErr('No auth token available')
            setLoading(false)
          }
          return
        }
        const r = await healthApi.services(token)
        if (!cancelled) {
          setReport(r)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setFetchErr(e instanceof Error ? e.message : String(e))
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [error, getToken])

  const counts = report
    ? {
        healthy: report.services.filter(s => s.status === 'healthy').length,
        degraded: report.services.filter(s => s.status === 'degraded').length,
        down: report.services.filter(s => s.status === 'down').length,
      }
    : null

  return (
    <div className="flex-1 p-4 md:p-8">
      <div
        className="rounded-xl border p-6 mb-4"
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
              Service Quality UI crashed
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              The dashboard UI threw. The health probes below were fetched directly from this
              fallback view — so you can still see what's healthy.
            </p>
          </div>
        </div>

        <pre
          className="text-xs p-3 rounded-md overflow-x-auto border"
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

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-md text-white"
            style={{ background: '#2563EB' }}
          >
            <RefreshCw size={14} /> Retry full UI
          </button>
        </div>
      </div>

      <div
        className="rounded-xl border p-6"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope size={16} style={{ color: '#2563EB' }} />
          <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>
            Subsystem health (fallback view)
          </h2>
        </div>

        {loading && (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Fetching /health/services…
          </p>
        )}

        {fetchErr && (
          <div
            className="rounded-md p-3 text-sm"
            style={{ background: '#FEE2E2', color: '#991B1B' }}
          >
            Could not reach health endpoint: <code>{fetchErr}</code>
          </div>
        )}

        {report && counts && (
          <>
            <div className="flex flex-wrap gap-3 mb-4 text-sm">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold"
                style={{ background: '#DCFCE7', color: '#16A34A' }}
              >
                <CheckCircle size={12} /> {counts.healthy} healthy
              </span>
              {counts.degraded > 0 && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: '#FEF3C7', color: '#D97706' }}
                >
                  <AlertTriangle size={12} /> {counts.degraded} degraded
                </span>
              )}
              {counts.down > 0 && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: '#FEE2E2', color: '#DC2626' }}
                >
                  <XCircle size={12} /> {counts.down} down
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: 'var(--color-text-muted)' }}>
                    <th className="text-left font-medium py-2 pr-3">Service</th>
                    <th className="text-left font-medium py-2 pr-3">Kind</th>
                    <th className="text-left font-medium py-2 pr-3">Status</th>
                    <th className="text-left font-medium py-2 pr-3">Latency</th>
                    <th className="text-left font-medium py-2">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {report.services.map(s => (
                    <tr
                      key={s.name}
                      style={{ borderTop: '1px solid var(--color-border)' }}
                    >
                      <td className="py-2 pr-3 font-medium" style={{ color: 'var(--color-text)' }}>
                        {s.name}
                      </td>
                      <td className="py-2 pr-3" style={{ color: 'var(--color-text-muted)' }}>
                        {s.kind}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                          style={{
                            background:
                              s.status === 'healthy'
                                ? '#DCFCE7'
                                : s.status === 'degraded'
                                ? '#FEF3C7'
                                : '#FEE2E2',
                            color:
                              s.status === 'healthy'
                                ? '#16A34A'
                                : s.status === 'degraded'
                                ? '#D97706'
                                : '#DC2626',
                          }}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3 font-mono" style={{ color: 'var(--color-text-muted)' }}>
                        {s.latencyMs ?? '—'}ms
                      </td>
                      <td className="py-2" style={{ color: 'var(--color-text-muted)' }}>
                        {s.message ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
