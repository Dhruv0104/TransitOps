const VEHICLE_STYLES = {
  AVAILABLE: 'bg-emerald-100 text-emerald-800',
  ON_TRIP: 'bg-sky-100 text-sky-800',
  IN_SHOP: 'bg-amber-100 text-amber-800',
  RETIRED: 'bg-slate-200 text-slate-700',
}

const DRIVER_STYLES = {
  AVAILABLE: 'bg-emerald-100 text-emerald-800',
  ON_TRIP: 'bg-sky-100 text-sky-800',
  OFF_DUTY: 'bg-slate-200 text-slate-700',
  SUSPENDED: 'bg-red-100 text-red-800',
}

const TRIP_STYLES = {
  DRAFT: 'bg-slate-100 text-slate-700',
  DISPATCHED: 'bg-sky-100 text-sky-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

export function StatusBadge({ value, kind = 'vehicle' }) {
  const styles =
    kind === 'driver' ? DRIVER_STYLES : kind === 'trip' ? TRIP_STYLES : VEHICLE_STYLES
  const className = styles[value] || TRIP_STYLES[value] || 'bg-slate-100 text-slate-700'
  const label = String(value || '').replaceAll('_', ' ')

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  )
}

