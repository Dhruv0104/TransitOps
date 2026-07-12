import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import { KpiSkeleton, PanelSkeleton, TableSkeleton } from '../components/Skeleton'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export default function ReportsPage() {
  const { token } = useAuth()
  const { formatMoney, currencySymbol } = useOrg()
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
  const monthlyRevenue = data?.monthlyRevenue || []
  const topCostliest = useMemo(() => {
    const rows = data?.topCostliest || []
    const max = Math.max(...rows.map((r) => r.operationalCost), 0)
    return rows.map((r) => ({
      ...r,
      pct: max > 0 ? Math.round((r.operationalCost / max) * 1000) / 10 : 0,
    }))
  }, [data?.topCostliest])

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

      {loading ? (
        <div className="mt-5 space-y-6">
          <KpiSkeleton count={5} />
          <div className="grid gap-4 lg:grid-cols-2">
            <PanelSkeleton />
            <PanelSkeleton />
          </div>
          <TableSkeleton rows={6} cols={6} />
        </div>
      ) : (
        <>
      {summary ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
            value={formatMoney(summary.operationalCost)}
          />
          <Kpi label="Total Revenue" value={formatMoney(summary.totalRevenue)} />
          <Kpi
            label="ROI"
            value={
              summary.roi != null
                ? `${(summary.roi * 100).toFixed(2)}%`
                : '—'
            }
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-semibold text-ink">Monthly Revenue</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue}>
                <CartesianGrid stroke="var(--color-line, #e5e7eb)" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#8b98a8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#8b98a8" tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => formatMoney(value)}
                  contentStyle={{
                    background: 'var(--color-surface, #fff)',
                    border: '1px solid var(--color-line, #e5e7eb)',
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="revenue" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-semibold text-ink">Top Costliest Vehicles</h2>
          <div className="mt-5 space-y-4">
            {topCostliest.length === 0 ? (
              <p className="text-sm text-muted">No cost data yet.</p>
            ) : (
              topCostliest.map((row) => (
                <div key={row.vehicleId}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-ink">
                      {row.registrationNo}
                      <span className="ml-1 font-normal text-muted">
                        — {row.name}
                      </span>
                    </span>
                    <span className="shrink-0 text-muted">
                      {formatMoney(row.operationalCost)}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-line/70">
                    <div
                      className="h-full rounded-full bg-sky-400 transition-all"
                      style={{
                        width: `${Math.max(row.pct, row.operationalCost > 0 ? 4 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
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
              <th className="px-4 py-3">Ops Cost ({currencySymbol})</th>
              <th className="px-4 py-3">Revenue ({currencySymbol})</th>
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
                <td className="px-4 py-3">{formatMoney(v.operationalCost)}</td>
                <td className="px-4 py-3">{formatMoney(v.revenue)}</td>
                <td className="px-4 py-3 text-accent">
                  {v.roi != null ? `${(v.roi * 100).toFixed(2)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </>
      )}
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
