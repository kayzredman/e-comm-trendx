import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Courier · trendMarga',
  description: 'Rider app for trendMarga deliveries',
}

export const viewport: Viewport = {
  themeColor: '#1E40AF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return <div className="cr-page">{children}</div>
}
