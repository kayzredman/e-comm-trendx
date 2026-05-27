import Link from 'next/link'
import { Truck, PackageCheck, MapPin, Clock } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

type ActiveDelivery = {
  id: string
  status: string
  total: string
  updatedAt: string
  createdAt: string
  customerName: string
  city: string | null
  region: string | null
}

const STATUS_META: Record<string, { label: string; bg: string; color: string; icon: typeof Truck }> = {
  PROCESSING:       { label: 'Processing',       bg: '#EDE9FE', color: '#7C3AED', icon: PackageCheck },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', bg: '#FFEDD5', color: '#EA580C', icon: Truck },
}

// Stage indices for the mini progress dots: 0=Pending, 1=Confirmed, 2=Processing, 3=Out, 4=Delivered
const STATUS_STAGE: Record<string, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ${hrs % 24}h ago`
}

function isStale(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() > 24 * 60 * 60 * 1000
}

export default function ActiveDeliveries({ deliveries }: { deliveries: ActiveDelivery[] }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#FFFFFF', border: '1.5px solid rgba(226,232,240,0.8)' }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1.5px solid #F1F5F9' }}
      >
        <div>
          <h2
            className="font-extrabold flex items-center gap-2"
            style={{ color: '#0F172A', fontSize: '15px' }}
          >
            <Truck size={15} style={{ color: '#EA580C' }} /> Active deliveries
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: '#94A3B8' }}>
            Oldest first — action these next
          </p>
        </div>
        <Link
          href="/cms/orders?status=OUT_FOR_DELIVERY"
          className="text-xs font-semibold"
          style={{ color: 'var(--color-primary)' }}
        >
          View all →
        </Link>
      </div>

      {!deliveries.length ? (
        <p className="px-5 py-10 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
          Nothing in motion right now ✨
        </p>
      ) : (
        <div>
          {deliveries.map(d => {
            const meta = STATUS_META[d.status] ?? STATUS_META.PROCESSING
            const Icon = meta.icon
            const currentStage = STATUS_STAGE[d.status] ?? 0
            const stale = isStale(d.updatedAt)
            const location = [d.city, d.region].filter(Boolean).join(', ') || '—'

            return (
              <Link
                key={d.id}
                href={`/cms/orders/${d.id}`}
                className="flex flex-col gap-2 px-5 py-3 hover:bg-gray-50 transition-colors"
                style={{ borderBottom: '1px solid #F8FAFC' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: meta.bg }}
                    >
                      <Icon size={15} style={{ color: meta.color }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className="text-sm font-semibold tabular-nums"
                          style={{ color: 'var(--color-text)' }}
                        >
                          #{d.id.slice(-8).toUpperCase()}
                        </p>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        {stale && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                            style={{ background: '#FEE2E2', color: '#DC2626' }}
                          >
                            STALE
                          </span>
                        )}
                      </div>
                      <p
                        className="text-xs mt-0.5 truncate"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {d.customerName}
                      </p>
                      <div
                        className="flex items-center gap-3 mt-1 text-[11px]"
                        style={{ color: '#94A3B8' }}
                      >
                        <span className="flex items-center gap-1">
                          <MapPin size={10} /> {location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {timeAgo(d.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p
                    className="text-sm font-bold tabular-nums shrink-0"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {formatPrice(d.total)}
                  </p>
                </div>

                {/* Mini stage timeline */}
                <div className="flex items-center gap-1 pl-11">
                  {['Pending', 'Confirmed', 'Processing', 'Out', 'Delivered'].map((stage, i) => {
                    const reached = i <= currentStage
                    const isCurrent = i === currentStage
                    return (
                      <div key={stage} className="flex items-center gap-1 flex-1 last:flex-none">
                        <div
                          className="rounded-full transition-all"
                          style={{
                            width: isCurrent ? 8 : 6,
                            height: isCurrent ? 8 : 6,
                            background: reached ? meta.color : '#E2E8F0',
                            boxShadow: isCurrent ? `0 0 0 3px ${meta.bg}` : 'none',
                          }}
                        />
                        {i < 4 && (
                          <div
                            className="flex-1 h-px"
                            style={{ background: reached && i < currentStage ? meta.color : '#E2E8F0' }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
