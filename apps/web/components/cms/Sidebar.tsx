'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Package, Tag, ShoppingCart, BarChart3,
  Users, FileText, Truck, Menu, X, LogOut, UserCog, Activity, Flag, ScanLine,
} from 'lucide-react'
import { useClerk, useUser } from '@clerk/nextjs'
import type { UserRole } from '@/lib/api'

type BadgeKind = 'brand' | 'green'

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  roles: UserRole[] | 'ALL'
  badge?: { text: string; kind?: BadgeKind }
}

type NavSection = {
  title: string
  items: NavItem[]
}

const sections: NavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard',  href: '/dashboard',           icon: LayoutDashboard, roles: 'ALL' },
      { label: 'Products',   href: '/cms/products',        icon: Package,         roles: ['OWNER', 'MANAGER', 'CONTENT_EDITOR', 'ORDER_MANAGER', 'VIEWER'], badge: { text: '128', kind: 'brand' } },
      { label: 'Categories', href: '/cms/categories',      icon: Tag,             roles: ['OWNER', 'MANAGER', 'CONTENT_EDITOR'] },
      { label: 'Orders',     href: '/cms/orders',          icon: ShoppingCart,    roles: ['OWNER', 'MANAGER', 'ORDER_MANAGER', 'VIEWER'], badge: { text: '12', kind: 'green' } },
    ],
  },
  {
    title: 'Store',
    items: [
      { label: 'POS Terminal', href: '/pos',          icon: ScanLine, roles: ['OWNER', 'MANAGER', 'CASHIER'], badge: { text: 'New', kind: 'brand' } },
      { label: 'Customers',    href: '/cms/customers', icon: Users,    roles: ['OWNER', 'MANAGER', 'ORDER_MANAGER', 'VIEWER'] },
      { label: 'Delivery',     href: '/cms/delivery',  icon: Truck,    roles: ['OWNER', 'MANAGER', 'ORDER_MANAGER'] },
      { label: 'CMS Pages',    href: '/cms/content',   icon: FileText, roles: ['OWNER', 'MANAGER', 'CONTENT_EDITOR'] },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Team',            href: '/cms/users',           icon: UserCog,  roles: ['OWNER'] },
      { label: 'Service Quality', href: '/cms/service-quality', icon: Activity, roles: ['OWNER', 'MANAGER'] },
      { label: 'Analytics',       href: '/cms/analytics',       icon: BarChart3, roles: ['OWNER', 'MANAGER'] },
      { label: 'Feature flags',   href: '/cms/feature-flags',   icon: Flag,     roles: ['OWNER'] },
    ],
  },
]

function canAccess(roles: UserRole[] | 'ALL', role: UserRole): boolean {
  if (roles === 'ALL') return true
  return roles.includes(role)
}

interface SidebarProps {
  role: UserRole
}

const BRAND_GRAD = 'linear-gradient(135deg,#2563EB,#7C3AED)'
const GREEN_GRAD = 'linear-gradient(135deg,#10B981,#059669)'

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { signOut } = useClerk()
  const { user } = useUser()

  const roleLabel =
    role === 'OWNER'          ? 'Store Owner'    :
    role === 'MANAGER'        ? 'Manager'        :
    role === 'CONTENT_EDITOR' ? 'Content Editor' :
    role === 'ORDER_MANAGER'  ? 'Order Manager'  :
    role.charAt(0) + role.slice(1).toLowerCase()

  const userName  = user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress ?? 'Admin'
  const userInits =
    ((user?.firstName?.[0] ?? userName[0] ?? 'A') +
     (user?.lastName?.[0]  ?? userName[1] ?? '')).toUpperCase()

  const NavList = () => (
    <nav className="flex-1 py-1 overflow-y-auto">
      {sections.map((section) => {
        const visible = section.items.filter((i) => canAccess(i.roles, role))
        if (visible.length === 0) return null
        return (
          <div key={section.title}>
            <div
              className="px-[18px] pt-5 pb-1.5 font-bold uppercase"
              style={{ fontSize: '10px', letterSpacing: '0.1em', color: '#475569' }}
            >
              {section.title}
            </div>
            {visible.map(({ label, href, icon: Icon, badge }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 mx-2.5 px-3.5 py-2 rounded-[9px] transition-colors"
                  style={{
                    background: active ? 'rgba(37,99,235,0.25)' : 'transparent',
                    color: active ? '#93C5FD' : '#94A3B8',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span
                      className="font-bold text-white text-center"
                      style={{
                        fontSize: '9px',
                        padding: '2px 7px',
                        borderRadius: '99px',
                        minWidth: '20px',
                        background: badge.kind === 'green' ? GREEN_GRAD : BRAND_GRAD,
                      }}
                    >
                      {badge.text}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )
      })}
    </nav>
  )

  const Brand = () => (
    <div className="px-[18px] py-[18px]" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-[9px] flex items-center justify-center font-black text-white"
          style={{ background: BRAND_GRAD, fontSize: '16px' }}
        >
          T
        </div>
        <div className="leading-tight">
          <div className="font-extrabold" style={{ color: '#F1F5F9', fontSize: '16px', letterSpacing: '-0.3px' }}>
            TrendMarga
          </div>
          <span
            className="inline-block mt-1 font-semibold"
            style={{
              fontSize: '10px',
              color: '#475569',
              background: '#1E293B',
              padding: '2px 7px',
              borderRadius: '4px',
            }}
          >
            {roleLabel === 'Store Owner' ? 'Owner Panel' : `${roleLabel} Panel`}
          </span>
        </div>
      </div>
    </div>
  )

  const Footer = () => (
    <div className="mt-auto px-[18px] py-3.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2.5">
        <div
          className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white font-bold shrink-0"
          style={{ background: BRAND_GRAD, fontSize: '13px' }}
        >
          {userInits}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold" style={{ color: '#E2E8F0', fontSize: '13px' }}>
            {userName}
          </div>
          <div style={{ color: '#64748B', fontSize: '11px' }}>{roleLabel}</div>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          aria-label="Sign out"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: 'rgba(239,68,68,0.85)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile header bar */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14"
        style={{ background: 'var(--color-navy-mid)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-xs"
            style={{ background: BRAND_GRAD }}
          >
            T
          </div>
          <span className="font-extrabold text-base" style={{ color: '#F1F5F9' }}>TrendMarga</span>
        </div>
        <button type="button" onClick={() => setOpen(true)} style={{ color: 'rgba(148,163,184,0.8)' }}>
          <Menu size={22} />
        </button>
      </header>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 w-full h-full bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside
            className="relative z-50 flex flex-col w-72 h-full"
            style={{ background: 'var(--color-navy-mid)' }}
          >
            <div className="flex items-center justify-between px-[18px] py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[9px] flex items-center justify-center font-black text-white" style={{ background: BRAND_GRAD, fontSize: '16px' }}>T</div>
                <span className="font-extrabold" style={{ color: '#F1F5F9', fontSize: '16px' }}>TrendMarga</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} style={{ color: 'rgba(148,163,184,0.7)' }}>
                <X size={20} />
              </button>
            </div>
            <NavList />
            <Footer />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-60 min-h-screen shrink-0"
        style={{ background: 'var(--color-navy-mid)' }}
      >
        <Brand />
        <NavList />
        <Footer />
      </aside>
    </>
  )
}
