import Link from 'next/link'
import { CheckCircle2, PackageCheck, Truck, PartyPopper } from 'lucide-react'
import type { ElementType } from 'react'

type Pipeline = {
  confirmed: number
  processing: number
  outForDelivery: number
  deliveredToday: number
}

type Tile = {
  label: string
  value: number
  icon: ElementType
  accentBg: string
  accentColor: string
  href: string
  hint: string
}

export default function DeliveryPipeline({ data }: { data: Pipeline }) {
  const tiles: Tile[] = [
    {
      label: 'Confirmed',
      value: data.confirmed,
      icon: CheckCircle2,
      accentBg: '#DBEAFE',
      accentColor: '#2563EB',
      href: '/cms/orders?status=CONFIRMED',
      hint: 'Awaiting packing',
    },
    {
      label: 'Processing',
      value: data.processing,
      icon: PackageCheck,
      accentBg: '#EDE9FE',
      accentColor: '#7C3AED',
      href: '/cms/orders?status=PROCESSING',
      hint: 'In warehouse',
    },
    {
      label: 'Out for delivery',
      value: data.outForDelivery,
      icon: Truck,
      accentBg: '#FFEDD5',
      accentColor: '#EA580C',
      href: '/cms/orders?status=OUT_FOR_DELIVERY',
      hint: 'With driver',
    },
    {
      label: 'Delivered today',
      value: data.deliveredToday,
      icon: PartyPopper,
      accentBg: '#DCFCE7',
      accentColor: '#16A34A',
      href: '/cms/orders?status=DELIVERED',
      hint: 'Completed today',
    },
  ]

  return (
    <div
      className="rounded-2xl p-5 mb-6 animate-fade-up"
      style={{ background: '#FFFFFF', border: '1.5px solid rgba(226,232,240,0.8)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-extrabold" style={{ color: '#0F172A', fontSize: '15px' }}>
            Delivery pipeline
          </h2>
          <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
            Orders in motion right now
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t, i) => {
          const Icon = t.icon
          return (
            <Link
              key={t.label}
              href={t.href}
              className={`group block rounded-xl p-4 transition-all hover:shadow-md stagger-${i + 1}`}
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: t.accentBg }}
                >
                  <Icon size={18} style={{ color: t.accentColor }} />
                </div>
                {/* connector dot — visual cue these are stages */}
                {i < 3 && (
                  <div className="hidden lg:flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full" style={{ background: '#CBD5E1' }} />
                    <span className="w-1 h-1 rounded-full" style={{ background: '#CBD5E1' }} />
                    <span className="w-1 h-1 rounded-full" style={{ background: '#CBD5E1' }} />
                  </div>
                )}
              </div>
              <p
                className="font-extrabold tabular-nums"
                style={{ color: '#0F172A', fontSize: '24px', lineHeight: 1 }}
              >
                {t.value}
              </p>
              <p className="text-xs font-semibold mt-2" style={{ color: '#0F172A' }}>
                {t.label}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: '#94A3B8' }}>
                {t.hint}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
