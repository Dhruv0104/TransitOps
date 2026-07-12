import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'
import TripRouteMap from '../components/TripRouteMap'

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
  const [trips, setTrips] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
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

  const availableVehicles = useMemo(
    () => vehicles.filter((v) => v.status === 'AVAILABLE'),
    [vehicles]
  )
  const availableDrivers = useMemo(
    () =>
      drivers.filter(
        (d) => d.status === 'AVAILABLE' && !d.licenseExpired && d.status !== 'SUSPENDED'
      ),
    [drivers]
  )

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId)
  const overload =
    selectedVehicle &&
    form.cargoWeightKg !== '' &&
    Number(form.cargoWeightKg) > selectedVehicle.maxLoadKg

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [tripData, vehicleData, driverData] = await Promise.all([
        apiRequest('/trips', { token }),
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
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.source || !form.destination) {
      setError('Select source and destination on the map or via search')
      return
    }
    if (!form.plannedDistance) {
      setError('Distance could not be calculated — set both map points')
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
      await apiRequest('/trips', {
        method: 'POST',
        token,
        body: {
          ...form,
          cargoWeightKg: Number(form.cargoWeightKg),
          plannedDistance: Number(form.plannedDistance),
          revenue: form.revenue === '' ? undefined : Number(form.revenue),
        },
      })
      setModalOpen(false)
      setForm(EMPTY_FORM)
      setRouteSource(null)
      setRouteDestination(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleRouteChange({ source, destination, plannedDistance }) {
    setRouteSource(source || null)
    setRouteDestination(destination || null)
    setForm((f) => ({
      ...f,
      source: source?.label || '',
      destination: destination?.label || '',
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
          onClick={() => {
            setForm(EMPTY_FORM)
            setRouteSource(null)
            setRouteDestination(null)
            setModalOpen(true)
          }}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
        >
          + Create Trip
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

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
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  Loading trips…
                </td>
              </tr>
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
                          <button
                            type="button"
                            onClick={() => handleDispatch(trip)}
                            className="rounded-md bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent"
                          >
                            Dispatch
                          </button>
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
                            className="rounded-md bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent"
                          >
                            Complete
                          </button>
                        ) : null}
                        {trip.status === 'DRAFT' || trip.status === 'DISPATCHED' ? (
                          <button
                            type="button"
                            onClick={() => handleCancel(trip)}
                            className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-danger"
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
        <Modal title="Create Trip" onClose={() => setModalOpen(false)} xl>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
            <TripRouteMap
              token={token}
              source={routeSource}
              destination={routeDestination}
              onRouteChange={handleRouteChange}
            />
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
              Revenue (optional)
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
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-line px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || overload}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
              >
                {saving ? 'Creating…' : 'Create Draft'}
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
              Revenue
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
