import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { StatusBadge } from '../components/StatusBadge'

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
  const maxBar = Math.max(1, ...Object.values(breakdown))

  const cards = kpis
    ? [
        { label: 'Active Vehicles', value: kpis.activeVehicles },
        { label: 'Available Vehicles', value: kpis.availableVehicles },
        { label: 'In Maintenance', value: kpis.vehiclesInMaintenance },
        { label: 'Active Trips', value: kpis.activeTrips },
        { label: 'Pending Trips', value: kpis.pendingTrips },
        { label: 'Drivers On Duty', value: kpis.driversOnDuty },
        { label: 'Fleet Utilization', value: `${kpis.fleetUtilization}%` },
      ]
    : []

  return (
    <section>
      <div>
        <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Fleet KPIs with filters by vehicle type, status, and region.
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <input
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
          placeholder="Filter type"
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
        />
        <select
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
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
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
          placeholder="Filter region"
          value={filters.region}
          onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
        />
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-muted">Loading KPIs…</p> : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-line bg-surface p-4 shadow-[0_8px_24px_rgba(28,36,48,0.04)]"
          >
            <p className="text-xs uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-semibold">Dispatch Overview</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(breakdown).map(([status, count]) => (
              <div key={status}>
                <div className="mb-1 flex justify-between text-xs text-muted">
                  <span>{status.replaceAll('_', ' ')}</span>
                  <span>{count}</span>
                </div>
                <div className="h-2 rounded-full bg-line">
                  <div
                    className="h-2 rounded-full bg-accent"
                    style={{ width: `${(count / maxBar) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <h2 className="border-b border-line px-4 py-3 font-semibold">
            Vehicle Status
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
              {(data?.recentVehicles || []).map((v) => (
                <tr key={v.id} className="border-t border-line/70">
                  <td className="px-4 py-2">
                    {v.registrationNo} — {v.name}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge value={v.status} />
                  </td>
                  <td className="px-4 py-2">{v.region || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
