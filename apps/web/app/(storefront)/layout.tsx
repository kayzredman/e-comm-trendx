import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TrendMarga — Shop Online',
}

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
