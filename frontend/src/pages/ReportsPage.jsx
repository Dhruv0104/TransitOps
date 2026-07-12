import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export default function ReportsPage() {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message || 'Failed to load reports')
      setData(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  async function downloadCsv() {
    setError('')
    try {
      const res = await fetch(`${API_BASE}/reports/export.csv`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message || 'CSV export failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'transitops-report.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    }
  }

  const summary = data?.summary
  const maxOps = Math.max(
    1,
    ...(data?.vehicles || []).map((v) => v.operationalCost)
  )

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            Fuel efficiency, fleet utilization, operational cost, and vehicle ROI.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
        >
          Export CSV
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-muted">Loading analytics…</p> : null}

      {summary ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-xs uppercase text-muted">Fleet Utilization</p>
            <p className="mt-2 text-2xl font-semibold">{summary.fleetUtilization}%</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-xs uppercase text-muted">Fuel Efficiency</p>
            <p className="mt-2 text-2xl font-semibold">
              {summary.fuelEfficiency != null
                ? `${summary.fuelEfficiency} km/L`
                : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-xs uppercase text-muted">Operational Cost</p>
            <p className="mt-2 text-2xl font-semibold">
              {summary.operationalCost.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-xs uppercase text-muted">Total Revenue</p>
            <p className="mt-2 text-2xl font-semibold">
              {summary.totalRevenue.toFixed(2)}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 rounded-xl border border-line bg-surface p-4">
        <h2 className="font-semibold">Operational Cost by Vehicle</h2>
        <div className="mt-4 space-y-3">
          {(data?.vehicles || []).map((v) => (
            <div key={v.vehicleId}>
              <div className="mb-1 flex justify-between text-xs text-muted">
                <span>
                  {v.registrationNo} — {v.name}
                </span>
                <span>{v.operationalCost.toFixed(2)}</span>
              </div>
              <div className="h-2 rounded-full bg-line">
                <div
                  className="h-2 rounded-full bg-sky-500"
                  style={{
                    width: `${(v.operationalCost / maxOps) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-canvas/70 text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Distance</th>
              <th className="px-4 py-3">Fuel Eff.</th>
              <th className="px-4 py-3">Ops Cost</th>
              <th className="px-4 py-3">Revenue</th>
              <th className="px-4 py-3">ROI</th>
            </tr>
          </thead>
          <tbody>
            {(data?.vehicles || []).map((v) => (
              <tr key={v.vehicleId} className="border-b border-line/70 last:border-0">
                <td className="px-4 py-3">
                  {v.registrationNo} — {v.name}
                </td>
                <td className="px-4 py-3">{v.distance}</td>
                <td className="px-4 py-3">
                  {v.fuelEfficiency != null ? `${v.fuelEfficiency} km/L` : '—'}
                </td>
                <td className="px-4 py-3">{v.operationalCost.toFixed(2)}</td>
                <td className="px-4 py-3">{v.revenue.toFixed(2)}</td>
                <td className="px-4 py-3">
                  {v.roi != null ? `${(v.roi * 100).toFixed(2)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
