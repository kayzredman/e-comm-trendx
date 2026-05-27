import type { Metadata } from 'next'
import StorefrontHeader from '@/components/storefront/Header'
import StorefrontFooter from '@/components/storefront/Footer'
import CartDrawer from '@/components/storefront/CartDrawer'
import { categoriesApi, type Category } from '@/lib/api'

export const metadata: Metadata = {
  title: 'trendMarga — Shop Online',
  description: 'Shop the latest trends — fast delivery across Ghana',
}

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let categories: Category[] = []
  try { categories = await categoriesApi.list() } catch {}

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--color-page)' }}>
      <StorefrontHeader categories={categories} />
      <main className="flex-1">{children}</main>
      <StorefrontFooter />
      <CartDrawer />
    </div>
  )
}
