function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

/** Base shimmer block */
export function Skeleton({ className = '', style }) {
  return <div className={cx('skeleton', className)} style={style} aria-hidden />
}

/** KPI / summary cards row */
export function KpiSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-line bg-surface p-4 space-y-3"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

/** Chart / panel placeholder */
export function PanelSkeleton({ className = '', height = 256 }) {
  return (
    <div className={cx('rounded-xl border border-line bg-surface p-4', className)}>
      <Skeleton className="mb-4 h-4 w-40" />
      <Skeleton className="w-full rounded-lg" style={{ height }} />
    </div>
  )
}

/** Table loading skeleton (standalone panel) */
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="border-b border-line bg-canvas/50 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-line/60">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={cx('h-3', c === 0 ? 'w-28' : 'w-20')}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Skeleton rows for use inside an existing <tbody> */
export function TableBodySkeleton({ rows = 6, cols = 5 }) {
  return Array.from({ length: rows }).map((_, r) => (
    <tr key={r} className="border-b border-line/70 last:border-0">
      {Array.from({ length: cols }).map((_, c) => (
        <td key={c} className="px-4 py-3">
          <Skeleton className={cx('h-3', c === 0 ? 'w-28' : 'w-16')} />
        </td>
      ))}
    </tr>
  ))
}

/** Generic list of cards */
export function ListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start justify-between gap-3 rounded-lg border border-line p-3"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3 max-w-xs" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-7 w-16 rounded-md" />
        </div>
      ))}
    </div>
  )
}

/** Full settings / form page skeleton */
export function FormPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="space-y-4 rounded-xl border border-line bg-panel p-5"
          >
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default Skeleton
