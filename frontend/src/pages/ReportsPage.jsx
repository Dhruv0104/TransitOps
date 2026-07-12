import { useCallback, useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '../context/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const PIE_COLORS = ['#f97316', '#38bdf8', '#34d399', '#a78bfa']

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

  async function downloadExport(kind) {
    setError('')
    try {
      const res = await fetch(`${API_BASE}/reports/export.${kind}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message || `${kind.toUpperCase()} export failed`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transitops-report.${kind}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    }
  }

  const summary = data?.summary
  const costChart = (data?.vehicles || []).map((v) => ({
    name: v.registrationNo,
    operationalCost: Number(v.operationalCost.toFixed(2)),
    fuelCost: Number(v.fuelCost.toFixed(2)),
    maintenanceCost: Number(v.maintenanceCost.toFixed(2)),
  }))

  const costBreakdown = summary
    ? [
        { name: 'Fuel', value: Number(summary.operationalCost > 0 ? (data.vehicles || []).reduce((s, v) => s + v.fuelCost, 0).toFixed(2) : 0) },
        { name: 'Maintenance', value: Number((data.vehicles || []).reduce((s, v) => s + v.maintenanceCost, 0).toFixed(2)) },
      ].filter((x) => x.value > 0)
    : []

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            Fuel efficiency, utilization, operational cost, and vehicle ROI.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadExport('csv')}
            className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-bold text-ink hover:border-accent/50"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => downloadExport('pdf')}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-500"
          >
            Export PDF
          </button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-muted">Loading analytics…</p> : null}

      {summary ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Fleet Utilization" value={`${summary.fleetUtilization}%`} />
          <Kpi
            label="Fuel Efficiency"
            value={
              summary.fuelEfficiency != null
                ? `${summary.fuelEfficiency} km/L`
                : '—'
            }
          />
          <Kpi
            label="Operational Cost"
            value={summary.operationalCost.toFixed(2)}
          />
          <Kpi label="Total Revenue" value={summary.totalRevenue.toFixed(2)} />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-semibold text-ink">Operational Cost by Vehicle</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costChart}>
                <CartesianGrid stroke="#2a3444" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#8b98a8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#8b98a8" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: '#1a222d',
                    border: '1px solid #2a3444',
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="operationalCost" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-semibold text-ink">Cost Breakdown</h2>
          <div className="mt-4 h-64">
            {costBreakdown.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {costBreakdown.map((entry, i) => (
                      <Cell
                        key={entry.name}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#1a222d',
                      border: '1px solid #2a3444',
                      borderRadius: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="grid h-full place-items-center text-sm text-muted">
                No cost data yet
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-panel text-xs uppercase text-muted">
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
                <td className="px-4 py-3 text-ink">
                  {v.registrationNo} — {v.name}
                </td>
                <td className="px-4 py-3">{v.distance}</td>
                <td className="px-4 py-3">
                  {v.fuelEfficiency != null ? `${v.fuelEfficiency} km/L` : '—'}
                </td>
                <td className="px-4 py-3">{v.operationalCost.toFixed(2)}</td>
                <td className="px-4 py-3">{v.revenue.toFixed(2)}</td>
                <td className="px-4 py-3 text-accent">
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

function Kpi({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-lg shadow-black/20">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  )
}
