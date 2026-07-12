const STATUS_CLASS = {
  vehicle: {
    AVAILABLE: 'status-badge status-success',
    ON_TRIP: 'status-badge status-info',
    IN_SHOP: 'status-badge status-warn',
    RETIRED: 'status-badge status-danger',
  },
  driver: {
    AVAILABLE: 'status-badge status-success',
    ON_TRIP: 'status-badge status-info',
    OFF_DUTY: 'status-badge status-neutral',
    SUSPENDED: 'status-badge status-danger',
  },
  trip: {
    DRAFT: 'status-badge status-neutral',
    DISPATCHED: 'status-badge status-info',
    COMPLETED: 'status-badge status-success',
    CANCELLED: 'status-badge status-danger',
  },
}

export function StatusBadge({ value, kind = 'vehicle' }) {
  const map = STATUS_CLASS[kind] || STATUS_CLASS.vehicle
  const className = map[value] || 'status-badge status-neutral'
  const label = String(value || '').replaceAll('_', ' ')

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${className}`}>
      {label}
    </span>
  )
}
