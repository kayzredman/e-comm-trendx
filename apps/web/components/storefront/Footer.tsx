import Link from 'next/link'

export default function StorefrontFooter() {
  return (
    <footer className="mt-auto border-t" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 sm:grid-cols-3">
        <div>
          <p className="font-bold text-lg mb-2" style={{ color: 'var(--color-primary)' }}>TrendMarga</p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Shop the latest trends — fast delivery across Ghana.
          </p>
        </div>
        <div>
          <p className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text)' }}>Shop</p>
          <ul className="space-y-2">
            {[['All Products', '/products'], ['New Arrivals', '/products?sort=newest']].map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text)' }}>Help</p>
          <ul className="space-y-2">
            {[['Track order', '/track'], ['Delivery info', '/delivery'], ['Contact us', '/contact']].map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-subtle)' }}>
        © {new Date().getFullYear()} TrendMarga. All rights reserved.
      </div>
    </footer>
  )
}
