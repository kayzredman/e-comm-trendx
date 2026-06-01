import { publicFeatures } from '@trendmarga/config'
import { CheckCircle2, XCircle, Flag } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const FLAG_LABELS: Record<keyof typeof publicFeatures, { name: string; desc: string }> = {
  cmsContent:    { name: 'CMS Content',           desc: 'Dynamic homepage hero & sections powered by CMS Content module.' },
  search:        { name: 'Storefront search',     desc: 'Global product search bar on the customer-facing site.' },
  inventory:     { name: 'Inventory tracking',    desc: 'Stock counts, low-stock badges, out-of-stock UI.' },
  notifications: { name: 'Notifications',         desc: 'SMS + email sent to customers on order events.' },
  reviews:       { name: 'Product reviews',       desc: 'Star ratings and customer reviews on product pages.' },
  discounts:     { name: 'Discount codes',        desc: 'Promo codes at checkout, managed in CMS.' },
  pwa:           { name: 'PWA',                   desc: 'Install-to-home-screen + push notifications.' },
  payments:      { name: 'Online payments',       desc: 'Paystack card / MoMo / bank at checkout. When off, storefront only offers cash on delivery.' },
}

export default function FeatureFlagsPage() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#2563EB,#7C3AED)' }}
        >
          <Flag size={18} color="#fff" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--color-text)' }}>
            Feature flags
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Read-only view of platform features. Toggle via environment variables on the API & web services.
          </p>
        </div>
      </div>

      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {Object.entries(FLAG_LABELS).map(([key, { name, desc }], i) => {
          const enabled = publicFeatures[key as keyof typeof publicFeatures]
          return (
            <div
              key={key}
              className="flex items-start gap-4 p-5"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-border)' }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: enabled ? '#DCFCE7' : 'var(--color-surface-muted)',
                  color: enabled ? '#16A34A' : 'var(--color-text-subtle)',
                }}
              >
                {enabled ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{name}</p>
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      background: enabled ? '#DCFCE7' : '#FEE2E2',
                      color: enabled ? '#16A34A' : '#DC2626',
                    }}
                  >
                    {enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs leading-relaxed mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
                <code
                  className="text-[11px] px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--color-surface-muted)', color: 'var(--color-text-subtle)' }}
                >
                  FEATURE_{key.replace(/([A-Z])/g, '_$1').toUpperCase()}
                </code>
              </div>
            </div>
          )
        })}
      </div>

      <div
        className="mt-6 rounded-2xl border p-5"
        style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}
      >
        <p className="text-sm font-semibold mb-2" style={{ color: '#92400E' }}>How to enable a feature</p>
        <ol className="text-xs space-y-1.5 list-decimal pl-5" style={{ color: '#78350F' }}>
          <li>Set <code className="px-1 rounded bg-amber-100">FEATURE_*</code> (server) AND <code className="px-1 rounded bg-amber-100">NEXT_PUBLIC_FEATURE_*</code> (client) to <code className="px-1 rounded bg-amber-100">true</code></li>
          <li>Restart the API service AND the web service</li>
          <li>Verify on this page that the flag flipped to Enabled</li>
        </ol>
        <p className="text-xs mt-3" style={{ color: '#78350F' }}>
          See <Link href="/" className="underline font-semibold">.env.example</Link> for the full list.
        </p>
      </div>
    </div>
  )
}
