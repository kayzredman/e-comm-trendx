import { Truck, Clock, MapPin, Package, CheckCircle, Phone } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Delivery Info — TrendMarga',
  description: 'Learn about our delivery options, zones, and timeframes',
}

const ZONES = [
  { zone: 'Accra Metro', time: '1 – 2 business days', fee: 'Free over ₵200, else ₵15' },
  { zone: 'Greater Accra (outskirts)', time: '2 – 3 business days', fee: '₵20' },
  { zone: 'Kumasi', time: '2 – 4 business days', fee: '₵30' },
  { zone: 'Cape Coast / Takoradi', time: '2 – 4 business days', fee: '₵25' },
  { zone: 'Northern Ghana', time: '3 – 5 business days', fee: '₵40' },
  { zone: 'International', time: 'Coming soon', fee: '—' },
]

const STEPS = [
  { icon: Package, label: 'Order placed', desc: 'We receive your order and confirm via SMS/email' },
  { icon: CheckCircle, label: 'Packed & dispatched', desc: 'Your order is packed and handed to our courier' },
  { icon: Truck, label: 'Out for delivery', desc: 'Track your package on the way to you' },
  { icon: MapPin, label: 'Delivered', desc: 'Package arrives at your doorstep' },
]

export default function DeliveryPage() {
  return (
    <div style={{ background: 'var(--color-page)', minHeight: '60vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0891B2, #22D3EE)', color: 'white' }}>
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-2">
            <Truck size={28} />
            <h1 className="text-3xl font-extrabold">Delivery</h1>
          </div>
          <p className="text-sm opacity-90">Fast, reliable delivery across Ghana — right to your door</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {/* How it works */}
        <section>
          <h2 className="text-xl font-extrabold mb-5" style={{ color: 'var(--color-text)' }}>How delivery works</h2>
          <div className="relative">
            {STEPS.map(({ icon: Icon, label, desc }, i) => (
              <div key={label} className="flex gap-4 mb-6 last:mb-0 relative">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10" style={{ background: 'var(--color-primary)', color: 'white' }}>
                    <Icon size={18} />
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-0.5 flex-1 mt-1" style={{ background: 'var(--color-border)' }} />
                  )}
                </div>
                <div className="pb-6">
                  <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{label}</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Delivery zones */}
        <section>
          <h2 className="text-xl font-extrabold mb-5" style={{ color: 'var(--color-text)' }}>Delivery zones & fees</h2>
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--color-surface-muted)' }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text)' }}>Zone</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text)' }}>Estimated time</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text)' }}>Delivery fee</th>
                </tr>
              </thead>
              <tbody>
                {ZONES.map((z, i) => (
                  <tr key={z.zone} style={{ borderTop: '1px solid var(--color-border)', background: i % 2 === 0 ? 'white' : 'var(--color-surface-muted)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{z.zone}</td>
                    <td className="px-4 py-3 flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                      <Clock size={13} /> {z.time}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{z.fee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Policy notes */}
        <section className="rounded-2xl p-5 space-y-3 border" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <h2 className="font-extrabold" style={{ color: '#166534' }}>Delivery policy</h2>
          {[
            'Orders placed before 12:00 PM are dispatched same business day.',
            'Free delivery on all orders over ₵200 within Accra Metro.',
            'We deliver Monday to Saturday, excluding public holidays.',
            'Cash on delivery is available in all zones.',
            'You will receive an SMS confirmation once your order is dispatched.',
          ].map(note => (
            <div key={note} className="flex items-start gap-2 text-sm" style={{ color: '#15803D' }}>
              <CheckCircle size={16} className="shrink-0 mt-0.5" /> {note}
            </div>
          ))}
        </section>

        {/* Contact */}
        <section className="rounded-2xl p-5 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Phone size={18} style={{ color: 'var(--color-primary)' }} />
            <h2 className="font-extrabold" style={{ color: 'var(--color-text)' }}>Need help?</h2>
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Our support team is available Mon–Sat, 8 AM – 8 PM.
            Call <a href="tel:+233000000000" className="font-semibold" style={{ color: 'var(--color-primary)' }}>+233 000 000 000</a> or
            email <a href="mailto:support@trendmarga.com" className="font-semibold" style={{ color: 'var(--color-primary)' }}>support@trendmarga.com</a>
          </p>
        </section>
      </div>
    </div>
  )
}
