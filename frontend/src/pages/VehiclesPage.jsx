import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest, apiUpload, API_BASE } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import Modal from '../components/Modal'
import LocationPicker from '../components/LocationPicker'
import { StatusBadge } from '../components/StatusBadge'
import { TableBodySkeleton } from '../components/Skeleton'
import {
  firstError,
  nonNegativeNumber,
  positiveNumber,
  required,
} from '../lib/validation'

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
const DOC_TYPES = ['RC', 'INSURANCE', 'PERMIT', 'PUC', 'FITNESS', 'OTHER']

export default function VehiclesPage() {
  const { token } = useAuth()
  const { currencySymbol } = useOrg()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    q: '',
    type: '',
    status: '',
    region: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [docsVehicle, setDocsVehicle] = useState(null)
  const [documents, setDocuments] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docForm, setDocForm] = useState({
    title: '',
    docType: 'RC',
    expiresAt: '',
    file: null,
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filters.q) params.set('q', filters.q)
      if (filters.type) params.set('type', filters.type)
      if (filters.status) params.set('status', filters.status)
      if (filters.region) params.set('region', filters.region)
      if (filters.sortBy) params.set('sortBy', filters.sortBy)
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
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
    const validationError = firstError(
      required(form.registrationNo, 'Registration No'),
      required(form.name, 'Name / Model'),
      required(form.type, 'Type'),
      positiveNumber(form.maxLoadKg, 'Max load (kg)'),
      nonNegativeNumber(form.odometer || '0', 'Odometer'),
      nonNegativeNumber(form.acquisitionCost, 'Acquisition cost'),
      required(form.region, 'Region (select on map)')
    )
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')
    try {
      const body = {
        registrationNo: form.registrationNo.trim(),
        name: form.name.trim(),
        type: form.type.trim(),
        maxLoadKg: Number(form.maxLoadKg),
        odometer: Number(form.odometer || 0),
        acquisitionCost: Number(form.acquisitionCost),
        region: form.region.trim(),
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

  async function openDocs(vehicle) {
    setDocsVehicle(vehicle)
    setDocForm({ title: '', docType: 'RC', expiresAt: '', file: null })
    setDocsLoading(true)
    setError('')
    try {
      const data = await apiRequest(`/vehicles/${vehicle.id}/documents`, {
        token,
      })
      setDocuments(data.documents || [])
    } catch (err) {
      setError(err.message)
      setDocuments([])
    } finally {
      setDocsLoading(false)
    }
  }

  async function uploadDocument(e) {
    e.preventDefault()
    if (!docsVehicle || !docForm.file) {
      setError('Choose a file to upload')
      return
    }

    const allowedExt = ['.pdf', '.jpg', '.jpeg', '.png']
    const allowedMime = ['application/pdf', 'image/jpeg', 'image/png', '']
    const name = docForm.file.name.toLowerCase()
    const ext = name.includes('.') ? `.${name.split('.').pop()}` : ''
    if (
      !allowedExt.includes(ext) ||
      (docForm.file.type && !allowedMime.includes(docForm.file.type))
    ) {
      setError('Only PDF, JPG, JPEG, and PNG files are allowed')
      return
    }

    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', docForm.file)
      fd.append('title', docForm.title || docForm.file.name)
      fd.append('docType', docForm.docType)
      if (docForm.expiresAt) fd.append('expiresAt', docForm.expiresAt)
      await apiUpload(`/vehicles/${docsVehicle.id}/documents`, {
        token,
        formData: fd,
      })
      setDocForm({ title: '', docType: 'RC', expiresAt: '', file: null })
      const data = await apiRequest(`/vehicles/${docsVehicle.id}/documents`, {
        token,
      })
      setDocuments(data.documents || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteDocument(doc) {
    if (!window.confirm(`Delete document ${doc.title}?`)) return
    setError('')
    try {
      await apiRequest(`/vehicles/${docsVehicle.id}/documents/${doc.id}`, {
        method: 'DELETE',
        token,
      })
      setDocuments((list) => list.filter((d) => d.id !== doc.id))
    } catch (err) {
      setError(err.message)
    }
  }

  const uploadBase = API_BASE.replace(/\/api$/, '')

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

      <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
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
        <select
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          value={filters.sortBy}
          onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}
        >
          <option value="createdAt">Sort: Created</option>
          <option value="registrationNo">Sort: Registration</option>
          <option value="name">Sort: Name</option>
          <option value="status">Sort: Status</option>
          <option value="odometer">Sort: Odometer</option>
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
              <TableBodySkeleton rows={6} cols={8} />
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
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(vehicle)}
                        className="rounded-md bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openDocs(vehicle)}
                        className="rounded-md border border-line bg-canvas px-2.5 py-1 text-xs font-semibold text-ink"
                      >
                        Docs
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
          xl
        >
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Registration No
              <input
                required
                className="field"
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
                className="field"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Type
              <input
                required
                className="field"
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
                className="field"
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
                className="field"
                value={form.odometer}
                onChange={(e) =>
                  setForm((f) => ({ ...f, odometer: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Acquisition Cost ({currencySymbol})
              <input
                required
                type="number"
                min="0"
                step="any"
                className="field"
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
                  className="field"
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
            <div className="sm:col-span-2 flex flex-col gap-1 text-sm font-semibold text-ink">
              Region (map)
              <LocationPicker
                value={form.region}
                onChange={(label) => setForm((f) => ({ ...f, region: label }))}
              />
            </div>
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

      {docsVehicle ? (
        <Modal
          wide
          title={`Documents — ${docsVehicle.registrationNo}`}
          onClose={() => setDocsVehicle(null)}
        >
          <form onSubmit={uploadDocument} className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Title
              <input
                className="field"
                value={docForm.title}
                onChange={(e) =>
                  setDocForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Insurance 2026"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Type
              <select
                className="field"
                value={docForm.docType}
                onChange={(e) =>
                  setDocForm((f) => ({ ...f, docType: e.target.value }))
                }
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Expires
              <input
                type="date"
                className="field"
                value={docForm.expiresAt}
                onChange={(e) =>
                  setDocForm((f) => ({ ...f, expiresAt: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              File
              <input
                type="file"
                required
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="field text-sm"
                onChange={(e) =>
                  setDocForm((f) => ({
                    ...f,
                    file: e.target.files?.[0] || null,
                  }))
                }
              />
              <span className="text-xs font-normal text-muted">
                Allowed: PDF, JPG, JPEG, PNG (max 8 MB)
              </span>
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
              >
                {saving ? 'Uploading…' : 'Upload document'}
              </button>
            </div>
          </form>

          <div className="mt-5 overflow-x-auto rounded-lg border border-line">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Expires</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docsLoading ? (
                  <TableBodySkeleton rows={3} cols={4} />
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-muted">
                      No documents yet.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="border-b border-line/60">
                      <td className="px-3 py-2">{doc.title}</td>
                      <td className="px-3 py-2">{doc.docType}</td>
                      <td className="px-3 py-2">
                        {doc.expiresAt
                          ? new Date(doc.expiresAt).toISOString().slice(0, 10)
                          : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <a
                            href={`${uploadBase}/uploads/${doc.storedName}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-accent"
                          >
                            Open
                          </a>
                          <button
                            type="button"
                            onClick={() => deleteDocument(doc)}
                            className="text-xs font-semibold text-danger"
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
        </Modal>
      ) : null}
    </section>
  )
}
