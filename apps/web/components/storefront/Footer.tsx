import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'

export default function StorefrontFooter() {
  return (
    <footer style={{ background: 'var(--color-navy-mid)' }}>
      <div className="max-w-6xl mx-auto px-4 py-12 grid gap-8 sm:grid-cols-4">
        {/* Brand */}
        <div className="sm:col-span-1">
          <div className="mb-3">
            <Logo variant="wordmark" tone="light" size={22} />
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Shop the latest trends — fast delivery across Ghana.
          </p>
          {/* Social */}
          <div className="flex gap-3 mt-5">
            {['𝕏', 'in', '📸', 'f'].map(s => (
              <button
                key={s}
                type="button"
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Shop */}
        <div>
          <p className="font-bold text-sm mb-4" style={{ color: 'rgba(255,255,255,0.9)' }}>Shop</p>
          <ul className="space-y-2.5">
            {[['All Products', '/products'], ['New Arrivals', '/new'], ['Hot Deals', '/deals'], ['Categories', '/categories']].map(([label, href]) => (
              <li key={label}>
                <Link href={href} className="text-sm transition-colors hover:opacity-100" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Help */}
        <div>
          <p className="font-bold text-sm mb-4" style={{ color: 'rgba(255,255,255,0.9)' }}>Help</p>
          <ul className="space-y-2.5">
            {[['Track Order', '/track'], ['Delivery Info', '/delivery'], ['Returns', '/returns'], ['Contact Us', '/contact']].map(([label, href]) => (
              <li key={label}>
                <Link href={href} className="text-sm transition-colors hover:opacity-100" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <p className="font-bold text-sm mb-2" style={{ color: 'rgba(255,255,255,0.9)' }}>Newsletter</p>
          <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Get the latest drops & deals.</p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
            />
            <button
              type="button"
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg,#2563EB,#7C3AED)' }}
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div
        className="border-t py-4 text-center text-xs"
        style={{ borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.25)' }}
      >
        © {new Date().getFullYear()} trendMarga. All rights reserved.
      </div>
    </footer>
  )
}
