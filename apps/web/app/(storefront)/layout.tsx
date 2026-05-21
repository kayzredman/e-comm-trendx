import type { Metadata } from 'next'
import StorefrontHeader from '@/components/storefront/Header'
import StorefrontFooter from '@/components/storefront/Footer'

export const metadata: Metadata = {
  title: 'TrendMarga — Shop Online',
  description: 'Shop the latest trends — fast delivery across Ghana',
}

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <StorefrontHeader />
      <main className="flex-1">{children}</main>
      <StorefrontFooter />
    </div>
  )
}
