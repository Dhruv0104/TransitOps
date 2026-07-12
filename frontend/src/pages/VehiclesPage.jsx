import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'

const EMPTY_FORM = {
  registrationNo: '',
  name: '',
  type: 'Van',
  maxLoadKg: '',
  odometer: '0',
  acquisitionCost: '',
  status: 'AVAILABLE',
  region: '',
}

const STATUSES = ['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED']

export default function VehiclesPage() {
  const { token } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ q: '', type: '', status: '', region: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filters.q) params.set('q', filters.q)
      if (filters.type) params.set('type', filters.type)
      if (filters.status) params.set('status', filters.status)
      if (filters.region) params.set('region', filters.region)
      const qs = params.toString()
      const data = await apiRequest(`/vehicles${qs ? `?${qs}` : ''}`, { token })
      setVehicles(data.vehicles || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, filters])

  useEffect(() => {
    load()
  }, [load])

  const types = useMemo(
    () => [...new Set(vehicles.map((v) => v.type).filter(Boolean))].sort(),
    [vehicles]
  )
  const regions = useMemo(
    () => [...new Set(vehicles.map((v) => v.region).filter(Boolean))].sort(),
    [vehicles]
  )

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(vehicle) {
    setEditing(vehicle)
    setForm({
      registrationNo: vehicle.registrationNo,
      name: vehicle.name,
      type: vehicle.type,
      maxLoadKg: String(vehicle.maxLoadKg),
      odometer: String(vehicle.odometer),
      acquisitionCost: String(vehicle.acquisitionCost),
      status: vehicle.status,
      region: vehicle.region || '',
    })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body = {
        registrationNo: form.registrationNo,
        name: form.name,
        type: form.type,
        maxLoadKg: Number(form.maxLoadKg),
        odometer: Number(form.odometer || 0),
        acquisitionCost: Number(form.acquisitionCost),
        region: form.region || null,
      }
      if (editing) {
        body.status = form.status
        await apiRequest(`/vehicles/${editing.id}`, {
          method: 'PUT',
          token,
          body,
        })
      } else {
        await apiRequest('/vehicles', { method: 'POST', token, body })
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(vehicle) {
    if (!window.confirm(`Delete vehicle ${vehicle.registrationNo}?`)) return
    setError('')
    try {
      await apiRequest(`/vehicles/${vehicle.id}`, { method: 'DELETE', token })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Vehicle Registry</h1>
          <p className="mt-1 text-sm text-muted">
            Master list of fleet assets with unique registration numbers.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
        >
          + Add Vehicle
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <input
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          placeholder="Search reg / name"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />
        <select
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
        >
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          value={filters.region}
          onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
        >
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-canvas/70 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Registration</th>
              <th className="px-4 py-3 font-semibold">Name / Model</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Max Load</th>
              <th className="px-4 py-3 font-semibold">Odometer</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Region</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  Loading vehicles…
                </td>
              </tr>
            ) : vehicles.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  No vehicles yet. Add Van-05 to start the demo workflow.
                </td>
              </tr>
            ) : (
              vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3 font-medium">{vehicle.registrationNo}</td>
                  <td className="px-4 py-3">{vehicle.name}</td>
                  <td className="px-4 py-3">{vehicle.type}</td>
                  <td className="px-4 py-3">{vehicle.maxLoadKg} kg</td>
                  <td className="px-4 py-3">{vehicle.odometer} km</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={vehicle.status} />
                  </td>
                  <td className="px-4 py-3">{vehicle.region || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(vehicle)}
                        className="rounded-md bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(vehicle)}
                        className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen ? (
        <Modal
          title={editing ? 'Edit Vehicle' : 'Add Vehicle'}
          onClose={() => setModalOpen(false)}
          wide
        >
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Registration No
              <input
                required
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={form.registrationNo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, registrationNo: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Name / Model
              <input
                required
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Type
              <input
                required
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Max Load (kg)
              <input
                required
                type="number"
                min="1"
                step="any"
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={form.maxLoadKg}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxLoadKg: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Odometer (km)
              <input
                type="number"
                min="0"
                step="any"
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={form.odometer}
                onChange={(e) =>
                  setForm((f) => ({ ...f, odometer: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Acquisition Cost
              <input
                required
                type="number"
                min="0"
                step="any"
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={form.acquisitionCost}
                onChange={(e) =>
                  setForm((f) => ({ ...f, acquisitionCost: e.target.value }))
                }
              />
            </label>
            {editing ? (
              <label className="flex flex-col gap-1 text-sm font-semibold">
                Status
                <select
                  className="rounded-lg border border-line px-3 py-2 font-normal"
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Region
              <input
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={form.region}
                onChange={(e) =>
                  setForm((f) => ({ ...f, region: e.target.value }))
                }
              />
            </label>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
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
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create vehicle'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  )
}
