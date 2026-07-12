import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import Modal from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'
import { ListSkeleton, TableBodySkeleton } from '../components/Skeleton'

export default function MaintenancePage() {
  const { token } = useAuth()
  const { formatMoney, currencySymbol } = useOrg()
  const [logs, setLogs] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    vehicleId: '',
    description: '',
    cost: '',
  })
  const [saving, setSaving] = useState(false)
  const [filters, setFilters] = useState({ vehicleId: '', active: 'all' })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filters.vehicleId) params.set('vehicleId', filters.vehicleId)
      if (filters.active === 'active') params.set('active', 'true')
      if (filters.active === 'closed') params.set('active', 'false')
      const qs = params.toString()
      const [logData, vehicleData] = await Promise.all([
        apiRequest(`/maintenance${qs ? `?${qs}` : ''}`, { token }),
        apiRequest('/vehicles', { token }),
      ])
      setLogs(logData.logs || [])
      setVehicles(vehicleData.vehicles || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, filters])

  useEffect(() => {
    load()
  }, [load])

  const eligibleVehicles = vehicles.filter((v) => v.status === 'AVAILABLE')

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.vehicleId) {
      setError('Vehicle is required')
      return
    }
    if (!form.description.trim()) {
      setError('Description is required')
      return
    }
    if (form.cost !== '' && (Number.isNaN(Number(form.cost)) || Number(form.cost) < 0)) {
      setError('Cost cannot be negative')
      return
    }
    setSaving(true)
    setError('')
    try {
      await apiRequest('/maintenance', {
        method: 'POST',
        token,
        body: {
          vehicleId: form.vehicleId,
          description: form.description.trim(),
          cost: form.cost === '' ? 0 : Number(form.cost),
        },
      })
      setModalOpen(false)
      setForm({ vehicleId: '', description: '', cost: '' })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleClose(log) {
    setError('')
    try {
      await apiRequest(`/maintenance/${log.id}/close`, { method: 'POST', token })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Maintenance</h1>
          <p className="mt-1 text-sm text-muted">
            Opening a log sets vehicle to In Shop; closing restores Available (unless
            Retired).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
        >
          + Schedule Maintenance
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <select
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          value={filters.vehicleId}
          onChange={(e) =>
            setFilters((f) => ({ ...f, vehicleId: e.target.value }))
          }
        >
          <option value="">All vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.registrationNo} — {v.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          value={filters.active}
          onChange={(e) =>
            setFilters((f) => ({ ...f, active: e.target.value }))
          }
        >
          <option value="all">All logs</option>
          <option value="active">Active only</option>
          <option value="closed">Closed only</option>
        </select>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-semibold">Active / Upcoming</h2>
          <div className="mt-3 space-y-2">
            {loading ? (
              <ListSkeleton count={3} />
            ) : logs.filter((l) => l.isActive).length === 0 ? (
              <p className="text-sm text-muted">No active maintenance.</p>
            ) : (
              logs
                .filter((l) => l.isActive)
                .map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-line p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {log.vehicle?.registrationNo} — {log.description}
                      </p>
                      <p className="text-xs text-muted">Cost: {formatMoney(log.cost)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleClose(log)}
                      className="rounded-md bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent"
                    >
                      Close
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-canvas/70 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Cost ({currencySymbol})</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableBodySkeleton rows={5} cols={4} />
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3">{log.vehicle?.registrationNo}</td>
                    <td className="px-4 py-3">{log.description}</td>
                    <td className="px-4 py-3">{formatMoney(log.cost)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={log.isActive ? 'IN_SHOP' : 'AVAILABLE'} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen ? (
        <Modal title="Schedule Maintenance" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleCreate} className="grid gap-3">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Vehicle
              <select
                required
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={form.vehicleId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, vehicleId: e.target.value }))
                }
              >
                <option value="">Select vehicle</option>
                {eligibleVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo} — {v.name} ({v.status})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Service / Description
              <input
                required
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Oil Change"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Cost ({currencySymbol})
              <input
                type="number"
                min="0"
                step="any"
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-line px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                {saving ? 'Saving…' : 'Submit'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  )
}
