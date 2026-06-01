'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { ShoppingBag, Menu, X, Search, ChevronDown, Truck, Sparkles, Tag, User, LayoutGrid } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import type { Category, SearchSuggestion } from '@/lib/api'
import { searchApi } from '@/lib/api'
import { useCartStore, selectItemCount } from '@/lib/cart-store'
import { publicFeatures } from '@trendmarga/config'
import { Logo } from '@/components/brand/Logo'
import { formatPrice } from '@/lib/utils'

type Props = { categories: Category[] }

export default function StorefrontHeader({ categories }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const [suggest, setSuggest] = useState<SearchSuggestion | null>(null)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const catRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const cartCount = useCartStore(selectItemCount)
  const openDrawer = useCartStore((s) => s.openDrawer)

  useEffect(() => setMounted(true), [])

  // Close categories dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSuggestOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Debounced suggest fetch
  useEffect(() => {
    if (!publicFeatures.search) return
    const term = searchQuery.trim()
    if (term.length < 2) {
      setSuggest(null)
      setSuggestLoading(false)
      return
    }
    let cancelled = false
    setSuggestLoading(true)
    const t = setTimeout(async () => {
      try {
        const data = await searchApi.suggest(term, 6)
        if (!cancelled) setSuggest(data)
      } catch {
        if (!cancelled) setSuggest({ query: term, products: [], categories: [] })
      } finally {
        if (!cancelled) setSuggestLoading(false)
      }
    }, 180)
    return () => { cancelled = true; clearTimeout(t) }
  }, [searchQuery])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setSuggestOpen(false)
      setMenuOpen(false)
    }
  }

  const navLinks = [
    { label: 'Deals', href: '/deals', icon: Tag },
    { label: "What's New", href: '/new', icon: Sparkles },
    { label: 'Delivery', href: '/delivery', icon: Truck },
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'rgba(255,255,255,0.90)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(226,232,240,0.7)',
        boxShadow: '0 1px 12px rgba(0,0,0,0.06)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" aria-label="trendMarga" className="shrink-0 mr-2 inline-flex items-center">
          <Logo variant="wordmark" size={22} />
        </Link>

        {/* Categories dropdown */}
        <div className="relative hidden md:block" ref={catRef}>
          <button
            onClick={() => setCatOpen(o => !o)}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
            style={{ color: catOpen ? 'var(--color-primary)' : 'var(--color-text)', background: catOpen ? 'var(--color-primary-light)' : 'transparent' }}
          >
            <LayoutGrid size={16} /> Categories <ChevronDown size={14} className={`transition-transform ${catOpen ? 'rotate-180' : ''}`} />
          </button>
          {catOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 rounded-xl border shadow-lg py-2 z-50" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <Link href="/products" onClick={() => setCatOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 font-medium" style={{ color: 'var(--color-text)' }}>
                All Products
              </Link>
              <div className="my-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
              {categories.length === 0 && (
                <p className="px-4 py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>No categories yet</p>
              )}
              {categories.map(cat => (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  onClick={() => setCatOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
                  style={{ color: 'var(--color-text)' }}
                >
                  {cat.imageUrl
                    ? <img src={cat.imageUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                    : <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>●</span>
                  }
                  {cat.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
              style={{ color: isActive(href) ? 'var(--color-primary)' : 'var(--color-text-muted)', background: isActive(href) ? 'var(--color-primary-light)' : 'transparent' }}
            >
              <Icon size={15} /> {label}
            </Link>
          ))}
        </nav>

        {/* Search bar — gated by FEATURE_SEARCH */}
        {publicFeatures.search ? (
        <div ref={searchRef} className="hidden md:flex flex-1 max-w-sm mx-auto relative">
          <form onSubmit={handleSearch} className="w-full relative">
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSuggestOpen(true) }}
              onFocus={e => { setSuggestOpen(true); e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface-muted)'; e.currentTarget.style.boxShadow = 'none'; }}
              placeholder="Search products… (⌘K)"
              className="w-full rounded-xl pl-4 pr-10 py-2 text-sm outline-none transition-all"
              style={{
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-surface-muted)',
                color: 'var(--color-text)',
              }}
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>
              <Search size={16} />
            </button>
          </form>

          {suggestOpen && searchQuery.trim().length >= 2 && (
            <div
              className="absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-xl z-50 overflow-hidden"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              {suggestLoading && !suggest && (
                <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>Searching…</div>
              )}
              {suggest && suggest.products.length === 0 && suggest.categories.length === 0 && (
                <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  No matches for <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>“{suggest.query}”</span>
                </div>
              )}
              {suggest && suggest.categories.length > 0 && (
                <div className="py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="px-4 pb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Categories</div>
                  {suggest.categories.map(c => (
                    <Link
                      key={c.id}
                      href={`/categories/${c.slug}`}
                      onClick={() => { setSuggestOpen(false); setSearchQuery('') }}
                      className="flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-gray-50"
                      style={{ color: 'var(--color-text)' }}
                    >
                      <Tag size={13} style={{ color: 'var(--color-primary)' }} />
                      <span className="font-medium">{c.name}</span>
                    </Link>
                  ))}
                </div>
              )}
              {suggest && suggest.products.length > 0 && (
                <div className="py-2">
                  <div className="px-4 pb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Products</div>
                  {suggest.products.map(p => (
                    <Link
                      key={p.id}
                      href={`/products/${p.slug}`}
                      onClick={() => { setSuggestOpen(false); setSearchQuery('') }}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50"
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={{ background: 'var(--color-surface-muted)' }}>
                        {p.image
                          ? <img src={p.image} alt="" className="w-full h-full object-cover" />
                          : <span style={{ color: 'var(--color-text-muted)' }}>📦</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{p.name}</div>
                        {p.categoryName && (
                          <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{p.categoryName}</div>
                        )}
                      </div>
                      <div className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-primary)' }}>{formatPrice(Number(p.price))}</div>
                    </Link>
                  ))}
                </div>
              )}
              {suggest && (suggest.products.length > 0 || suggest.categories.length > 0) && (
                <button
                  type="button"
                  onClick={() => { router.push(`/products?q=${encodeURIComponent(suggest.query)}`); setSuggestOpen(false); setSearchQuery('') }}
                  className="w-full text-center px-4 py-2.5 text-xs font-bold border-t hover:bg-gray-50"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
                >
                  See all results for “{suggest.query}” →
                </button>
              )}
            </div>
          )}
        </div>
        ) : <div className="hidden md:flex flex-1" />}

        {/* Right icons */}
        <div className="flex items-center gap-2 ml-auto md:ml-0">
          <Link
            href="/dashboard"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(37,99,235,0.28)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '.9'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
          >
            <User size={15} /> Sign In
          </Link>
          <Link href="/cart" className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors relative sm:hidden" style={{ color: 'var(--color-text-muted)' }}>
            <div className="relative">
              <ShoppingBag size={20} />
              {mounted && cartCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ fontSize: '10px', background: 'var(--color-primary)', padding: '0 3px' }}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </div>
            <span className="text-xs leading-none">Cart</span>
          </Link>
          <button
            type="button"
            onClick={openDrawer}
            aria-label="Open cart"
            className="hidden sm:flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors relative"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <div className="relative">
              <ShoppingBag size={20} />
              {mounted && cartCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ fontSize: '10px', background: 'var(--color-primary)', padding: '0 3px' }}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </div>
            <span className="text-xs leading-none">Cart</span>
          </button>
          {/* Mobile menu toggle */}
          <button className="md:hidden p-2 rounded-lg" onClick={() => setMenuOpen(o => !o)} style={{ color: 'var(--color-text)' }}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t px-4 py-3 space-y-1" style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderColor: 'var(--color-border)' }}>
          {/* Mobile search — gated by FEATURE_SEARCH */}
          {publicFeatures.search && (
          <form onSubmit={handleSearch} className="relative mb-3">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products…"
              className="w-full rounded-xl border pl-4 pr-10 py-2.5 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', background: '#F8F9FA', color: 'var(--color-text)' }}
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>
              <Search size={16} />
            </button>
          </form>
          )}
          <Link href="/products" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 py-2 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            <LayoutGrid size={16} /> All Products
          </Link>
          {categories.map(cat => (
            <Link key={cat.id} href={`/categories/${cat.slug}`} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 py-1.5 pl-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {cat.name}
            </Link>
          ))}
          <div className="my-2 border-t" style={{ borderColor: 'var(--color-border)' }} />
          {navLinks.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 py-2 text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              <Icon size={16} /> {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
