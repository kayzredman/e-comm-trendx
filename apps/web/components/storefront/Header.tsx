'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ShoppingBag, Menu, X, Search } from 'lucide-react'
import { usePathname } from 'next/navigation'

export default function StorefrontHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
  ]

  return (
    <header className="sticky top-0 z-30 border-b" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="font-bold text-xl tracking-tight shrink-0" style={{ color: 'var(--color-primary)' }}>
          TrendMarga
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium transition-colors"
              style={{ color: pathname === href ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link href="/products" className="hidden sm:flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
            <Search size={15} /> Search
          </Link>
          <Link
            href="/cart"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <ShoppingBag size={16} />
            <span className="hidden sm:inline">Cart</span>
          </Link>
          {/* Mobile menu */}
          <button className="md:hidden" onClick={() => setMenuOpen(o => !o)} style={{ color: 'var(--color-text)' }}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t px-4 py-3 space-y-1" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {navLinks.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="block py-2 text-sm font-medium"
              style={{ color: 'var(--color-text)' }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
