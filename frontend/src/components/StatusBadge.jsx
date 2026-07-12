const VEHICLE_STYLES = {
  AVAILABLE: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
  ON_TRIP: 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30',
  IN_SHOP: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
  RETIRED: 'bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/30',
}

const DRIVER_STYLES = {
  AVAILABLE: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
  ON_TRIP: 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30',
  OFF_DUTY: 'bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/30',
  SUSPENDED: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',
}

const TRIP_STYLES = {
  DRAFT: 'bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/30',
  DISPATCHED: 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30',
  COMPLETED: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
  CANCELLED: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',
}

export function StatusBadge({ value, kind = 'vehicle' }) {
  const styles =
    kind === 'driver' ? DRIVER_STYLES : kind === 'trip' ? TRIP_STYLES : VEHICLE_STYLES
  const className =
    styles[value] || TRIP_STYLES[value] || 'bg-slate-500/20 text-slate-300'
  const label = String(value || '').replaceAll('_', ' ')

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${className}`}
    >
      {label}
    </span>
  )
}
