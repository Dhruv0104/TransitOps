import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import Modal from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'
import { TableBodySkeleton } from '../components/Skeleton'
import TripRouteMap, { resolvePlaceLabel } from '../components/TripRouteMap'

const STEPS = ['DRAFT', 'DISPATCHED', 'COMPLETED']

const EMPTY_FORM = {
  source: '',
  destination: '',
  vehicleId: '',
  driverId: '',
  cargoWeightKg: '',
  plannedDistance: '',
  revenue: '',
}

export default function TripsPage() {
  const { token } = useAuth()
  const { currencySymbol } = useOrg()
  const [trips, setTrips] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTrip, setEditingTrip] = useState(null)
  const [completeTrip, setCompleteTrip] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [routeSource, setRouteSource] = useState(null)
  const [routeDestination, setRouteDestination] = useState(null)
  const [completeForm, setCompleteForm] = useState({
    finalOdometer: '',
    fuelConsumed: '',
    revenue: '',
  })
  const [saving, setSaving] = useState(false)
  const [filters, setFilters] = useState({
    q: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  const availableVehicles = useMemo(() => {
    const list = vehicles.filter((v) => v.status === 'AVAILABLE')
    if (editingTrip?.vehicleId) {
      const current = vehicles.find((v) => v.id === editingTrip.vehicleId)
      if (current && !list.some((v) => v.id === current.id)) list.unshift(current)
    }
    return list
  }, [vehicles, editingTrip])

  const availableDrivers = useMemo(() => {
    const list = drivers.filter(
      (d) => d.status === 'AVAILABLE' && !d.licenseExpired && d.status !== 'SUSPENDED'
    )
    if (editingTrip?.driverId) {
      const current = drivers.find((d) => d.id === editingTrip.driverId)
      if (current && !list.some((d) => d.id === current.id)) list.unshift(current)
    }
    return list
  }, [drivers, editingTrip])

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId)
  const overload =
    selectedVehicle &&
    form.cargoWeightKg !== '' &&
    Number(form.cargoWeightKg) > selectedVehicle.maxLoadKg

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filters.q) params.set('q', filters.q)
      if (filters.status) params.set('status', filters.status)
      if (filters.sortBy) params.set('sortBy', filters.sortBy)
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
      const qs = params.toString()

      const [tripData, vehicleData, driverData] = await Promise.all([
        apiRequest(`/trips${qs ? `?${qs}` : ''}`, { token }),
        apiRequest('/vehicles', { token }),
        apiRequest('/drivers', { token }),
      ])
      setTrips(tripData.trips || [])
      setVehicles(vehicleData.vehicles || [])
      setDrivers(driverData.drivers || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, filters])

  useEffect(() => {
    load()
  }, [load])

  async function handleSaveTrip(e) {
    e.preventDefault()
    if (!form.source || !form.destination) {
      setError('Select source and destination on the map or via search')
      return
    }
    if (!form.vehicleId) {
      setError('Vehicle is required')
      return
    }
    if (!form.driverId) {
      setError('Driver is required')
      return
    }
    if (
      form.cargoWeightKg === '' ||
      Number.isNaN(Number(form.cargoWeightKg)) ||
      Number(form.cargoWeightKg) <= 0
    ) {
      setError('Cargo weight must be greater than 0')
      return
    }
    if (!form.plannedDistance || Number(form.plannedDistance) <= 0) {
      setError('Distance could not be calculated — set both map points')
      return
    }
    if (form.revenue !== '' && (Number.isNaN(Number(form.revenue)) || Number(form.revenue) < 0)) {
      setError('Revenue cannot be negative')
      return
    }
    if (overload) {
      setError(
        `Overload warning: ${form.cargoWeightKg} kg exceeds max ${selectedVehicle.maxLoadKg} kg`
      )
      return
    }
    setSaving(true)
    setError('')
    try {
      const body = {
        ...form,
        cargoWeightKg: Number(form.cargoWeightKg),
        plannedDistance: Number(form.plannedDistance),
        revenue: form.revenue === '' ? undefined : Number(form.revenue),
      }
      if (editingTrip) {
        await apiRequest(`/trips/${editingTrip.id}`, {
          method: 'PUT',
          token,
          body,
        })
      } else {
        await apiRequest('/trips', {
          method: 'POST',
          token,
          body,
        })
      }
      closeTripModal()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function closeTripModal() {
    setModalOpen(false)
    setEditingTrip(null)
    setForm(EMPTY_FORM)
    setRouteSource(null)
    setRouteDestination(null)
  }

  function openCreateTrip() {
    setEditingTrip(null)
    setForm(EMPTY_FORM)
    setRouteSource(null)
    setRouteDestination(null)
    setError('')
    setModalOpen(true)
  }

  async function openEditTrip(trip) {
    setEditingTrip(trip)
    setForm({
      source: trip.source || '',
      destination: trip.destination || '',
      vehicleId: trip.vehicleId,
      driverId: trip.driverId,
      cargoWeightKg: String(trip.cargoWeightKg),
      plannedDistance: String(trip.plannedDistance),
      revenue: trip.revenue != null ? String(trip.revenue) : '',
    })
    setRouteSource(trip.source ? { label: trip.source } : null)
    setRouteDestination(trip.destination ? { label: trip.destination } : null)
    setError('')
    setModalOpen(true)

    // Resolve saved labels to coordinates so inputs + map pins populate
    const [src, dst] = await Promise.all([
      resolvePlaceLabel(trip.source),
      resolvePlaceLabel(trip.destination),
    ])
    if (src) setRouteSource(src)
    if (dst) setRouteDestination(dst)
  }

  function handleRouteChange({ source, destination, plannedDistance }) {
    setRouteSource(source || null)
    setRouteDestination(destination || null)
    setForm((f) => ({
      ...f,
      source: source?.label || f.source || '',
      destination: destination?.label || f.destination || '',
      plannedDistance:
        plannedDistance !== undefined && plannedDistance !== ''
          ? plannedDistance
          : f.plannedDistance,
    }))
  }

  async function handleDispatch(trip) {
    setError('')
    try {
      await apiRequest(`/trips/${trip.id}/dispatch`, { method: 'POST', token })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCancel(trip) {
    if (!window.confirm('Cancel this trip?')) return
    setError('')
    try {
      await apiRequest(`/trips/${trip.id}/cancel`, { method: 'POST', token })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleComplete(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await apiRequest(`/trips/${completeTrip.id}/complete`, {
        method: 'POST',
        token,
        body: {
          finalOdometer: Number(completeForm.finalOdometer),
          fuelConsumed:
            completeForm.fuelConsumed === ''
              ? undefined
              : Number(completeForm.fuelConsumed),
          revenue:
            completeForm.revenue === ''
              ? undefined
              : Number(completeForm.revenue),
        },
      })
      setCompleteTrip(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function stepIndex(status) {
    if (status === 'CANCELLED') return -1
    return STEPS.indexOf(status)
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Trip Management</h1>
          <p className="mt-1 text-sm text-muted">
            Draft → Dispatched → Completed / Cancelled with capacity and availability checks.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateTrip}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
        >
          + Create Trip
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <input
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          placeholder="Search route…"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />
        <select
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All statuses</option>
          {['DRAFT', 'DISPATCHED', 'COMPLETED', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          value={filters.sortBy}
          onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}
        >
          <option value="createdAt">Sort: Created</option>
          <option value="status">Sort: Status</option>
          <option value="cargoWeightKg">Sort: Cargo</option>
          <option value="plannedDistance">Sort: Distance</option>
        </select>
        <select
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          value={filters.sortOrder}
          onChange={(e) =>
            setFilters((f) => ({ ...f, sortOrder: e.target.value }))
          }
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-canvas/70 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3">Lifecycle</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableBodySkeleton rows={6} cols={7} />
            ) : trips.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  No trips yet.
                </td>
              </tr>
            ) : (
              trips.map((trip) => {
                const idx = stepIndex(trip.status)
                return (
                  <tr key={trip.id} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {trip.source} → {trip.destination}
                      </div>
                      <div className="text-xs text-muted">
                        {trip.plannedDistance} km planned
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {trip.vehicle?.registrationNo || '—'}
                    </td>
                    <td className="px-4 py-3">{trip.driver?.name || '—'}</td>
                    <td className="px-4 py-3">{trip.cargoWeightKg} kg</td>
                    <td className="px-4 py-3">
                      {trip.status === 'CANCELLED' ? (
                        <span className="text-xs text-danger">Cancelled</span>
                      ) : (
                        <div className="flex gap-1">
                          {STEPS.map((step, i) => (
                            <span
                              key={step}
                              className={`h-2 w-8 rounded-full ${
                                i <= idx ? 'bg-accent' : 'bg-line'
                              }`}
                              title={step}
                            />
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={trip.status} kind="trip" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {trip.status === 'DRAFT' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditTrip(trip)}
                              className="btn-action"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDispatch(trip)}
                              className="btn-action"
                            >
                              Dispatch
                            </button>
                          </>
                        ) : null}
                        {trip.status === 'DISPATCHED' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCompleteTrip(trip)
                              setCompleteForm({
                                finalOdometer: String(trip.vehicle?.odometer ?? 0),
                                fuelConsumed: '',
                                revenue: trip.revenue != null ? String(trip.revenue) : '',
                              })
                            }}
                            className="btn-action"
                          >
                            Complete
                          </button>
                        ) : null}
                        {trip.status === 'DRAFT' || trip.status === 'DISPATCHED' ? (
                          <button
                            type="button"
                            onClick={() => handleCancel(trip)}
                            className="btn-action-danger"
                          >
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {modalOpen ? (
        <Modal
          title={editingTrip ? 'Edit Draft Trip' : 'Create Trip'}
          onClose={closeTripModal}
          xl
        >
          <form onSubmit={handleSaveTrip} className="grid gap-3 sm:grid-cols-2">
            <TripRouteMap
              token={token}
              source={routeSource}
              destination={routeDestination}
              onRouteChange={handleRouteChange}
            />
            {editingTrip ? (
              <p className="sm:col-span-2 text-xs text-muted">
                Existing route labels are loaded. Re-select source/destination on
                the map to recalculate road distance, or keep the current planned
                distance.
              </p>
            ) : null}
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Vehicle (Available only)
              <select
                required
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={form.vehicleId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, vehicleId: e.target.value }))
                }
              >
                <option value="">Select vehicle</option>
                {availableVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo} — {v.name} (max {v.maxLoadKg} kg)
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Driver (Available + valid license)
              <select
                required
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={form.driverId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, driverId: e.target.value }))
                }
              >
                <option value="">Select driver</option>
                {availableDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.licenseNumber})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Cargo Weight (kg)
              <input
                required
                type="number"
                min="0"
                step="any"
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={form.cargoWeightKg}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cargoWeightKg: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Planned Distance (km)
              <input
                required
                type="number"
                min="0"
                step="any"
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={form.plannedDistance}
                onChange={(e) =>
                  setForm((f) => ({ ...f, plannedDistance: e.target.value }))
                }
              />
              <span className="text-xs font-normal text-muted">
                Auto-filled from map route — you can override if needed.
              </span>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold sm:col-span-2">
              Revenue ({currencySymbol}) (optional)
              <input
                type="number"
                min="0"
                step="any"
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={form.revenue}
                onChange={(e) =>
                  setForm((f) => ({ ...f, revenue: e.target.value }))
                }
              />
            </label>
            {overload ? (
              <p className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                Overload warning: {form.cargoWeightKg} kg. Max capacity:{' '}
                {selectedVehicle.maxLoadKg} kg.
              </p>
            ) : null}
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeTripModal}
                className="rounded-lg border border-line px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || overload}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
              >
                {saving
                  ? 'Saving…'
                  : editingTrip
                    ? 'Save changes'
                    : 'Create Draft'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {completeTrip ? (
        <Modal
          title="Complete Trip"
          onClose={() => setCompleteTrip(null)}
        >
          <form onSubmit={handleComplete} className="grid gap-3">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Final Odometer
              <input
                required
                type="number"
                min="0"
                step="any"
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={completeForm.finalOdometer}
                onChange={(e) =>
                  setCompleteForm((f) => ({
                    ...f,
                    finalOdometer: e.target.value,
                  }))
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Fuel Consumed (liters)
              <input
                type="number"
                min="0"
                step="any"
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={completeForm.fuelConsumed}
                onChange={(e) =>
                  setCompleteForm((f) => ({
                    ...f,
                    fuelConsumed: e.target.value,
                  }))
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Revenue ({currencySymbol})
              <input
                type="number"
                min="0"
                step="any"
                className="rounded-lg border border-line px-3 py-2 font-normal"
                value={completeForm.revenue}
                onChange={(e) =>
                  setCompleteForm((f) => ({ ...f, revenue: e.target.value }))
                }
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompleteTrip(null)}
                className="rounded-lg border border-line px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                {saving ? 'Saving…' : 'Complete Trip'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  )
}
