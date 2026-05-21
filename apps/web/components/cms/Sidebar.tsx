'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Package, Tag, ShoppingCart,
  Users, FileText, Truck, Menu, X, LogOut,
} from 'lucide-react'
import { useClerk } from '@clerk/nextjs'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', href: '/cms/products', icon: Package },
  { label: 'Categories', href: '/cms/categories', icon: Tag },
  { label: 'Orders', href: '/cms/orders', icon: ShoppingCart },
  { label: 'Customers', href: '/cms/customers', icon: Users },
  { label: 'Delivery', href: '/cms/delivery', icon: Truck },
  { label: 'Content', href: '/cms/content', icon: FileText, soon: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { signOut } = useClerk()

  const NavList = () => (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {navItems.map(({ label, href, icon: Icon, soon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={soon ? '#' : href}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: active ? 'var(--color-primary-light)' : 'transparent',
              color: active ? 'var(--color-primary)' : soon ? 'var(--color-text-subtle)' : 'var(--color-text)',
              cursor: soon ? 'default' : 'pointer',
            }}
          >
            <Icon size={18} />
            <span>{label}</span>
            {soon && (
              <span className="ml-auto text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                Soon
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Mobile header bar */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14 border-b"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <span className="font-bold text-base" style={{ color: 'var(--color-primary)' }}>TrendMarga CMS</span>
        <button onClick={() => setOpen(true)} style={{ color: 'var(--color-text)' }}>
          <Menu size={22} />
        </button>
      </header>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside
            className="relative z-50 flex flex-col w-72 h-full"
            style={{ background: 'var(--color-surface)' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <span className="font-bold text-base" style={{ color: 'var(--color-primary)' }}>TrendMarga CMS</span>
              <button onClick={() => setOpen(false)} style={{ color: 'var(--color-text-muted)' }}><X size={20} /></button>
            </div>
            <NavList />
            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 mx-3 mb-4 px-3 py-2.5 rounded-lg text-sm font-medium"
              style={{ color: 'var(--color-error)' }}
            >
              <LogOut size={18} /> Sign out
            </button>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-64 min-h-screen border-r shrink-0"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <span className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>TrendMarga</span>
          <span className="text-xs ml-1.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>CMS</span>
        </div>
        <NavList />
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 mx-3 mb-4 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-red-50"
          style={{ color: 'var(--color-error)' }}
        >
          <LogOut size={18} /> Sign out
        </button>
      </aside>
    </>
  )
}
