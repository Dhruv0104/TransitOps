import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'
import {
  dateRequired,
  email as validateEmail,
  firstError,
  minLength,
  phone,
  positiveNumber,
  required,
} from '../lib/validation'

const EMPTY_FORM = {
  name: '',
  email: '',
  licenseNumber: '',
  licenseCategory: 'LMV',
  licenseExpiry: '',
  contactNumber: '',
  safetyScore: '100',
  status: 'AVAILABLE',
}

const STATUSES = ['AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'SUSPENDED']

function toDateInput(value) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

export default function DriversPage() {
  const { token } = useAuth()
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    q: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [reminderMsg, setReminderMsg] = useState('')
  const [reminderSending, setReminderSending] = useState(false)

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
      const data = await apiRequest(`/drivers${qs ? `?${qs}` : ''}`, { token })
      setDrivers(data.drivers || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, filters])

  useEffect(() => {
    load()
  }, [load])

  const alerts = drivers.filter((d) => d.licenseExpired || d.licenseExpiringSoon)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(driver) {
    setEditing(driver)
    setForm({
      name: driver.name,
      email: driver.email || '',
      licenseNumber: driver.licenseNumber,
      licenseCategory: driver.licenseCategory,
      licenseExpiry: toDateInput(driver.licenseExpiry),
      contactNumber: driver.contactNumber,
      safetyScore: String(driver.safetyScore),
      status: driver.status,
    })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationError = firstError(
      minLength(form.name, 2, 'Name'),
      validateEmail(form.email, 'Email'),
      required(form.licenseNumber, 'License number'),
      required(form.licenseCategory, 'License category'),
      dateRequired(form.licenseExpiry, 'License expiry'),
      phone(form.contactNumber),
      editing
        ? positiveNumber(form.safetyScore, 'Safety score', { allowZero: true })
        : ''
    )
    if (validationError) {
      setError(validationError)
      return
    }
    if (editing) {
      const score = Number(form.safetyScore)
      if (score < 0 || score > 100) {
        setError('Safety score must be between 0 and 100')
        return
      }
    }

    setSaving(true)
    setError('')
    try {
      const body = {
        name: form.name.trim(),
        email: form.email.trim(),
        licenseNumber: form.licenseNumber.trim(),
        licenseCategory: form.licenseCategory.trim(),
        licenseExpiry: form.licenseExpiry,
        contactNumber: form.contactNumber.trim(),
      }
      if (editing) {
        body.safetyScore = Number(form.safetyScore)
        body.status = form.status
        await apiRequest(`/drivers/${editing.id}`, {
          method: 'PUT',
          token,
          body,
        })
      } else {
        await apiRequest('/drivers', { method: 'POST', token, body })
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(driver) {
    if (!window.confirm(`Delete driver ${driver.name}?`)) return
    setError('')
    try {
      await apiRequest(`/drivers/${driver.id}`, { method: 'DELETE', token })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function sendLicenseReminders() {
    setReminderMsg('')
    setError('')
    setReminderSending(true)
    try {
      const data = await apiRequest('/jobs/license-reminders?force=true', {
        method: 'POST',
        token,
        body: { force: true },
      })

      if (data.warning && data.sent === 0) {
        setReminderMsg(data.warning)
      } else if (data.sent > 0) {
        const names = (data.drivers || []).map((d) => d.name).join(', ')
        const to = (data.recipients || []).join(', ')
        setReminderMsg(
          `Email sent for ${data.sent} driver(s)${names ? `: ${names}` : ''}. To: ${to || 'n/a'} (${data.mode})`
        )
      } else {
        setReminderMsg(data.message || 'No reminders sent')
      }
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setReminderSending(false)
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Driver Management</h1>
          <p className="mt-1 text-sm text-muted">
            Profiles, license compliance, safety scores, and duty status.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={sendLicenseReminders}
            disabled={reminderSending}
            className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:border-accent/50 disabled:opacity-60"
          >
            {reminderSending ? 'Sending…' : 'Send license reminders'}
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
          >
            + Add Driver
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <input
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          placeholder="Search name / license"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />
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
          value={filters.sortBy}
          onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}
        >
          <option value="createdAt">Sort: Created</option>
          <option value="name">Sort: Name</option>
          <option value="licenseExpiry">Sort: License expiry</option>
          <option value="safetyScore">Sort: Safety score</option>
          <option value="status">Sort: Status</option>
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

      {reminderMsg ? (
        <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {reminderMsg}
        </p>
      ) : null}

      {alerts.length > 0 ? (
        <div className="mt-4 space-y-2">
          {alerts.slice(0, 3).map((driver) => (
            <div
              key={driver.id}
              className={`rounded-xl border px-4 py-3 text-sm ${
                driver.licenseExpired
                  ? 'border-red-500/40 bg-red-500/10 text-red-300'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
              }`}
            >
              <p className="font-semibold text-ink">
                {driver.licenseExpired ? 'License expired' : 'License expiring soon'}
              </p>
              <p className="mt-1 text-muted">
                {driver.licenseExpired
                  ? `${driver.name} (${driver.licenseNumber}) cannot be assigned to trips until the license is renewed.`
                  : `${driver.name}'s license expires in ${driver.daysUntilLicenseExpiry} day(s).`}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-canvas/70 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">License No</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Expiry</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 font-semibold">Safety</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted">
                  Loading drivers…
                </td>
              </tr>
            ) : drivers.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted">
                  No drivers yet. Register Alex with a valid license for the demo.
                </td>
              </tr>
            ) : (
              drivers.map((driver) => (
                <tr key={driver.id} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3 font-medium">{driver.name}</td>
                  <td className="px-4 py-3 text-muted">{driver.email || '—'}</td>
                  <td className="px-4 py-3">{driver.licenseNumber}</td>
                  <td className="px-4 py-3">{driver.licenseCategory}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span>{toDateInput(driver.licenseExpiry)}</span>
                      {driver.licenseExpired ? (
                        <span className="text-xs font-semibold text-red-400">Expired</span>
                      ) : driver.licenseExpiringSoon ? (
                        <span className="text-xs font-semibold text-amber-400">
                          Expiring soon
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">{driver.contactNumber}</td>
                  <td className="px-4 py-3">{driver.safetyScore}%</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      value={
                        driver.licenseExpired && driver.status !== 'ON_TRIP'
                          ? 'SUSPENDED'
                          : driver.status
                      }
                      kind="driver"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(driver)}
                        className="rounded-md bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(driver)}
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
          title={editing ? 'Edit Driver' : 'Add Driver'}
          onClose={() => setModalOpen(false)}
          wide
        >
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Name
              <input
                required
                className="field"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Email
              <input
                required
                type="email"
                className="field"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="driver@example.com"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              License Number
              <input
                required
                className="field"
                value={form.licenseNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, licenseNumber: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              License Category
              <input
                required
                className="field"
                value={form.licenseCategory}
                onChange={(e) =>
                  setForm((f) => ({ ...f, licenseCategory: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              License Expiry
              <input
                required
                type="date"
                className="field"
                value={form.licenseExpiry}
                onChange={(e) =>
                  setForm((f) => ({ ...f, licenseExpiry: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Contact Number
              <input
                required
                className="field"
                value={form.contactNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactNumber: e.target.value }))
                }
              />
            </label>
            {editing ? (
              <>
                <label className="flex flex-col gap-1 text-sm font-semibold">
                  Safety Score
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="field"
                    value={form.safetyScore}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, safetyScore: e.target.value }))
                    }
                  />
                </label>
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
              </>
            ) : null}
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
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create driver'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  )
}
