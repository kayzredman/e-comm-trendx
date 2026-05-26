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
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {visibleItems.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: active ? 'rgba(37,99,235,0.25)' : 'transparent',
              color: active ? '#93C5FD' : 'rgba(148,163,184,0.85)',
              borderLeft: active ? '3px solid #3B82F6' : '3px solid transparent',
            }}
          >
            <Icon size={17} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )

  const RoleTag = () => (
    <div className="px-5 pb-3">
      <span
        className="text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{
          background: role === 'OWNER' ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.07)',
          color: role === 'OWNER' ? '#C4B5FD' : 'rgba(148,163,184,0.6)',
          border: '1px solid ' + (role === 'OWNER' ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)'),
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
        className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14"
        style={{ background: 'var(--color-navy-mid)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="font-extrabold text-base" style={{ color: '#F1F5F9' }}>TrendMarga CMS</span>
        <button type="button" onClick={() => setOpen(true)} style={{ color: 'rgba(148,163,184,0.8)' }}>
          <Menu size={22} />
        </button>
      </header>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <button type="button" aria-label="Close menu" className="absolute inset-0 w-full h-full bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside
            className="relative z-50 flex flex-col w-72 h-full"
            style={{ background: 'var(--color-navy-mid)' }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-xs" style={{ background: 'linear-gradient(135deg,#2563EB,#7C3AED)' }}>T</div>
                <span className="font-extrabold text-base" style={{ color: '#F1F5F9' }}>TrendMarga</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} style={{ color: 'rgba(148,163,184,0.7)' }}><X size={20} /></button>
            </div>
            <NavList />
            <RoleTag />
            <button
              type="button"
              onClick={() => signOut()}
              className="flex items-center gap-3 mx-3 mb-4 px-3 py-2.5 rounded-xl text-sm font-medium"
              style={{ color: 'rgba(239,68,68,0.8)' }}
            >
              <LogOut size={18} /> Sign out
            </button>
          </aside>
        </div>
      )}

      <aside
        className="hidden md:flex flex-col w-64 min-h-screen shrink-0"
        style={{ background: 'var(--color-navy-mid)' }}
      >
        {/* Logo */}
        <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-sm"
              style={{ background: 'linear-gradient(135deg,#2563EB,#7C3AED)' }}
            >
              T
            </div>
            <div>
              <span className="font-extrabold text-base" style={{ color: '#F1F5F9' }}>TrendMarga</span>
              <span
                className="text-xs ml-1.5 font-semibold px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}
              >
                CMS
              </span>
            </div>
          </div>
        </div>
        <NavList />
        <RoleTag />
        <button
          type="button"
          onClick={() => signOut()}
          className="flex items-center gap-3 mx-3 mb-4 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ color: 'rgba(239,68,68,0.8)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <LogOut size={18} /> Sign out
        </button>
      </aside>
    </>
  )
}
