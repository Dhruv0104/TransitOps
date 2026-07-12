import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { StatusBadge } from '../components/StatusBadge'
import { KpiSkeleton, PanelSkeleton, TableSkeleton } from '../components/Skeleton'

const STATUS_BAR_COLORS = {
  AVAILABLE: 'bg-emerald-500',
  ON_TRIP: 'bg-sky-500',
  IN_SHOP: 'bg-amber-500',
  RETIRED: 'bg-red-500',
}

export default function DashboardPage() {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [filters, setFilters] = useState({ type: '', status: '', region: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filters.type) params.set('type', filters.type)
      if (filters.status) params.set('status', filters.status)
      if (filters.region) params.set('region', filters.region)
      const qs = params.toString()
      const result = await apiRequest(`/dashboard${qs ? `?${qs}` : ''}`, { token })
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, filters])

  useEffect(() => {
    load()
  }, [load])

  const kpis = data?.kpis
  const breakdown = data?.vehicleStatusBreakdown || {}
  const statusBars = useMemo(() => {
    const entries = Object.entries(breakdown)
    const total = entries.reduce((s, [, count]) => s + count, 0)
    return entries.map(([status, count]) => ({
      status,
      label: status.replaceAll('_', ' '),
      count,
      pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      color: STATUS_BAR_COLORS[status] || 'bg-accent',
    }))
  }, [breakdown])

  const cards = kpis
    ? [
        { label: 'Active Vehicles', value: kpis.activeVehicles, tone: 'text-sky-400' },
        { label: 'Available Vehicles', value: kpis.availableVehicles, tone: 'text-emerald-400' },
        { label: 'In Maintenance Vehicles', value: kpis.vehiclesInMaintenance, tone: 'text-amber-400' },
        { label: 'Active Trips', value: kpis.activeTrips, tone: 'text-orange-400' },
        { label: 'Pending Trips', value: kpis.pendingTrips, tone: 'text-slate-300' },
        { label: 'Drivers On Duty', value: kpis.driversOnDuty, tone: 'text-sky-300' },
        {
          label: 'Fleet Utilization',
          value: `${kpis.fleetUtilization}%`,
          tone: 'text-accent',
        },
      ]
    : []

  return (
    <section>
      <div>
        <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Fleet overview with vehicle type filters and status charts.
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <input
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          placeholder="Filter by vehicle type"
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
        />
        <select
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All statuses</option>
          <option value="AVAILABLE">AVAILABLE</option>
          <option value="ON_TRIP">ON_TRIP</option>
          <option value="IN_SHOP">IN_SHOP</option>
          <option value="RETIRED">RETIRED</option>
        </select>
        <input
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          placeholder="Filter by region"
          value={filters.region}
          onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
        />
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      {loading ? (
        <div className="mt-5 space-y-6">
          <KpiSkeleton count={7} />
          <div className="grid gap-4 lg:grid-cols-2">
            <PanelSkeleton />
            <TableSkeleton rows={5} cols={3} />
          </div>
          <TableSkeleton rows={5} cols={7} />
        </div>
      ) : null}

      {!loading ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-line bg-surface p-4 shadow-lg shadow-black/20"
              >
                <p className="text-xs uppercase tracking-wide text-muted">
                  {card.label}
                </p>
                <p className={`mt-2 text-2xl font-semibold ${card.tone}`}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-4">
              <h2 className="font-semibold text-ink">Vehicle Status</h2>
              <div className="mt-5 space-y-4">
                {statusBars.length === 0 ? (
                  <p className="text-sm text-muted">No vehicles to chart.</p>
                ) : (
                  statusBars.map((row) => (
                    <div key={row.status}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium capitalize text-ink">
                          {row.label}
                        </span>
                        <span className="text-muted">
                          {row.count} · {row.pct}%
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-line/70">
                        <div
                          className={`h-full rounded-full transition-all ${row.color}`}
                          style={{ width: `${Math.max(row.pct, row.count > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <h2 className="border-b border-line px-4 py-3 font-semibold text-ink">
                Recent Vehicles
              </h2>
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-2">Vehicle</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Region</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentVehicles || []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-muted">
                        No vehicles yet
                      </td>
                    </tr>
                  ) : (
                    (data?.recentVehicles || []).map((v) => (
                      <tr key={v.id} className="border-t border-line/70">
                        <td className="px-4 py-2 text-ink">
                          {v.registrationNo} — {v.name}
                        </td>
                        <td className="px-4 py-2">
                          <StatusBadge value={v.status} />
                        </td>
                        <td className="px-4 py-2 text-muted">{v.region || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-surface">
            <h2 className="border-b border-line px-4 py-3 font-semibold text-ink">
              Recent Trips
            </h2>
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-2">Trip ID</th>
                  <th className="px-4 py-2">Route</th>
                  <th className="px-4 py-2">Vehicle</th>
                  <th className="px-4 py-2">Driver</th>
                  <th className="px-4 py-2">Cargo</th>
                  <th className="px-4 py-2">Distance</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recentTrips || []).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted">
                      No trips yet — create one from Trip Dispatcher.
                    </td>
                  </tr>
                ) : (
                  (data?.recentTrips || []).map((trip) => (
                    <tr key={trip.id} className="border-t border-line/70">
                      <td className="px-4 py-2 font-semibold text-accent">
                        {trip.tripCode || '—'}
                      </td>
                      <td className="px-4 py-2 text-ink">
                        <span className="font-medium">
                          {trip.source} → {trip.destination}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-muted">
                        {trip.vehicle?.registrationNo || '—'}
                      </td>
                      <td className="px-4 py-2 text-muted">
                        {trip.driver?.name || '—'}
                      </td>
                      <td className="px-4 py-2 text-muted">
                        {trip.cargoWeightKg} kg
                      </td>
                      <td className="px-4 py-2 text-muted">
                        {trip.plannedDistance} km
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge value={trip.status} kind="trip" />
                      </td>
                      <td className="px-4 py-2 text-muted">
                        {trip.updatedAt
                          ? new Date(trip.updatedAt).toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  )
}
