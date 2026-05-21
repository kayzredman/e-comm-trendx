'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Package, Tag, ShoppingCart,
  Users, FileText, Truck, Menu, X, LogOut, UserCog, Activity,
} from 'lucide-react'
import { useClerk } from '@clerk/nextjs'
import type { UserRole } from '@/lib/api'

// ── Role-based access control ────────────────────────────────────────────────
type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  roles: UserRole[] | 'ALL'
}

const navItems: NavItem[] = [
  { label: 'Dashboard',  href: '/dashboard',       icon: LayoutDashboard, roles: 'ALL' },
  { label: 'Products',   href: '/cms/products',    icon: Package,         roles: ['OWNER', 'MANAGER', 'CONTENT_EDITOR', 'ORDER_MANAGER', 'VIEWER'] },
  { label: 'Categories', href: '/cms/categories',  icon: Tag,             roles: ['OWNER', 'MANAGER', 'CONTENT_EDITOR'] },
  { label: 'Orders',     href: '/cms/orders',      icon: ShoppingCart,    roles: ['OWNER', 'MANAGER', 'ORDER_MANAGER', 'VIEWER'] },
  { label: 'Customers',  href: '/cms/customers',   icon: Users,           roles: ['OWNER', 'MANAGER', 'ORDER_MANAGER', 'VIEWER'] },
  { label: 'Delivery',   href: '/cms/delivery',    icon: Truck,           roles: ['OWNER', 'MANAGER', 'ORDER_MANAGER'] },
  { label: 'Content',    href: '/cms/content',     icon: FileText,        roles: ['OWNER', 'MANAGER', 'CONTENT_EDITOR'] },
  { label: 'Team',          href: '/cms/users',            icon: UserCog,        roles: ['OWNER'] },
  { label: 'Service Quality', href: '/cms/service-quality', icon: Activity,      roles: ['OWNER', 'MANAGER'] },
]

function canAccess(roles: UserRole[] | 'ALL', role: UserRole): boolean {
  if (roles === 'ALL') return true
  return roles.includes(role)
}

interface SidebarProps {
  role: UserRole
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { signOut } = useClerk()

  const visibleItems = navItems.filter(item => canAccess(item.roles, role))

  const roleLabel =
    role === 'CONTENT_EDITOR' ? 'Editor' :
    role === 'ORDER_MANAGER'  ? 'Order Mgr' :
    role.charAt(0) + role.slice(1).toLowerCase()

  const NavList = () => (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {visibleItems.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: active ? 'var(--color-primary-light)' : 'transparent',
              color: active ? 'var(--color-primary)' : 'var(--color-text)',
            }}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )

  const RoleTag = () => (
    <div className="px-5 pb-3">
      <span
        className="text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{
          background: role === 'OWNER' ? '#EDE9FE' : 'var(--color-surface-muted)',
          color: role === 'OWNER' ? '#7C3AED' : 'var(--color-text-muted)',
        }}
      >
        {roleLabel}
      </span>
    </div>
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
            <RoleTag />
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
        <RoleTag />
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
