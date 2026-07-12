import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { ROLES } from '../constants/roles'

function Pill({ label, tone = 'neutral' }) {
  const tones = {
    success: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
    danger: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',
    neutral: 'bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/30',
  }
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {label}
    </span>
  )
}

const ROLE_OPTIONS = Object.values(ROLES)

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'DISPATCHER',
  verified: false,
  isActive: true,
}

export default function UsersPage() {
  const { token, user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ q: '', role: '', verified: '' })
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
      if (filters.role) params.set('role', filters.role)
      if (filters.verified) params.set('verified', filters.verified)
      const qs = params.toString()
      const data = await apiRequest(`/users${qs ? `?${qs}` : ''}`, { token })
      setUsers(data.users || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, filters])

  useEffect(() => {
    load()
  }, [load])

  const pending = users.filter((u) => !u.verified)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(u) {
    setEditing(u)
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      verified: u.verified,
      isActive: u.isActive,
    })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editing) {
        const body = {
          name: form.name,
          email: form.email,
          role: form.role,
          verified: form.verified,
          isActive: form.isActive,
        }
        if (form.password) body.password = form.password
        await apiRequest(`/users/${editing.id}`, {
          method: 'PUT',
          token,
          body,
        })
      } else {
        await apiRequest('/users', {
          method: 'POST',
          token,
          body: {
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
            verified: form.verified,
            isActive: form.isActive,
          },
        })
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleVerify(u) {
    setError('')
    try {
      await apiRequest(`/users/${u.id}/verify`, { method: 'POST', token })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleToggleActive(u) {
    if (u.id === currentUser?.id) {
      setError('You cannot deactivate your own account')
      return
    }
    setError('')
    try {
      await apiRequest(`/users/${u.id}`, {
        method: 'PUT',
        token,
        body: { isActive: !u.isActive },
      })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(u) {
    if (u.id === currentUser?.id) {
      setError('You cannot delete your own account')
      return
    }
    if (!window.confirm(`Delete user ${u.name}?`)) return
    setError('')
    try {
      await apiRequest(`/users/${u.id}`, { method: 'DELETE', token })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Users & Verification</h1>
          <p className="mt-1 text-sm text-muted">
            Create accounts, verify access, and activate or deactivate users.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 hover:bg-orange-500"
        >
          + Add User
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {pending.length > 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {pending.length} user{pending.length === 1 ? '' : 's'} awaiting verification.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search name or email…"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          className="min-w-[200px] flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
        <select
          value={filters.role}
          onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        >
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <select
          value={filters.verified}
          onChange={(e) =>
            setFilters((f) => ({ ...f, verified: e.target.value }))
          }
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        >
          <option value="">All verification</option>
          <option value="true">Verified</option>
          <option value="false">Pending</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-panel">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Verified</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Loading users…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{u.name}</td>
                  <td className="px-4 py-3 text-muted">{u.email}</td>
                  <td className="px-4 py-3 text-ink">
                    {u.role.replaceAll('_', ' ')}
                  </td>
                  <td className="px-4 py-3">
                    <Pill
                      label={u.verified ? 'Verified' : 'Pending'}
                      tone={u.verified ? 'success' : 'warning'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Pill
                      label={u.isActive ? 'Active' : 'Inactive'}
                      tone={u.isActive ? 'success' : 'danger'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink hover:border-accent/50"
                      >
                        Edit
                      </button>
                      {!u.verified ? (
                        <button
                          type="button"
                          onClick={() => handleVerify(u)}
                          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
                        >
                          Verify
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u)}
                        className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink hover:border-accent/50"
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u)}
                        className="rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-red-500/20"
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
          onClose={() => setModalOpen(false)}
          title={editing ? 'Edit User' : 'Add User'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Name
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-lg border border-line bg-surface px-3 py-2 font-normal outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Email
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="rounded-lg border border-line bg-surface px-3 py-2 font-normal outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              {editing ? 'New password (optional)' : 'Password'}
              <input
                type="password"
                required={!editing}
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                className="rounded-lg border border-line bg-surface px-3 py-2 font-normal outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Role
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="rounded-lg border border-line bg-surface px-3 py-2 font-normal outline-none focus:border-accent"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-4 text-sm text-ink">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.verified}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, verified: e.target.checked }))
                  }
                  className="accent-orange-500"
                />
                Verified
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                  className="accent-orange-500"
                />
                Active
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-70"
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create user'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  )
}
