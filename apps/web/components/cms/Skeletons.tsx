export function SkeletonBlock({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-md ${className}`}
      style={{
        background: 'linear-gradient(90deg, #E2E8F0 0%, #F1F5F9 50%, #E2E8F0 100%)',
        backgroundSize: '200% 100%',
        animation: 'tm-skeleton-shimmer 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  )
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="w-full" style={{ height }}>
      <div className="flex items-end justify-between h-full gap-2 px-2 pb-2">
        {Array.from({ length: 14 }).map((_, i) => (
          <SkeletonBlock
            key={i}
            className="flex-1"
            style={{ height: `${30 + ((i * 13) % 60)}%`, minWidth: 8 }}
          />
        ))}
      </div>
    </div>
  )
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonBlock className="w-8 h-8 rounded-lg" />
          <div className="flex-1 flex flex-col gap-1.5">
            <SkeletonBlock style={{ height: 10, width: '60%' }} />
            <SkeletonBlock style={{ height: 8, width: '40%' }} />
          </div>
          <SkeletonBlock style={{ height: 14, width: 60 }} />
        </div>
      ))}
    </div>
  )
}

export function KpiSkeleton() {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <SkeletonBlock style={{ height: 10, width: 100 }} />
        <SkeletonBlock className="w-8 h-8 rounded-lg" />
      </div>
      <SkeletonBlock style={{ height: 26, width: '70%' }} />
      <SkeletonBlock className="mt-2" style={{ height: 10, width: '50%' }} />
    </div>
  )
}
