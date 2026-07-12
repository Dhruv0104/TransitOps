import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { TableBodySkeleton } from '../components/Skeleton'
import { ROLES } from '../constants/roles'
import {
  email as validateEmail,
  firstError,
  minLength,
  password as validatePassword,
  required,
} from '../lib/validation'

function Pill({ label, tone = 'neutral' }) {
  const tones = {
    success: 'status-badge status-success',
    danger: 'status-badge status-danger',
    neutral: 'status-badge status-neutral',
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
  isActive: true,
}

export default function UsersPage() {
  const { token, user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ q: '', role: '', isActive: '' })
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
      if (filters.isActive) params.set('isActive', filters.isActive)
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
      isActive: u.isActive,
    })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationError = firstError(
      minLength(form.name, 2, 'Name'),
      validateEmail(form.email),
      required(form.role, 'Role'),
      validatePassword(form.password, 'Password', {
        required: !editing,
        min: 6,
      })
    )
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')
    try {
      if (editing) {
        const body = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
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
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
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
          <h1 className="text-2xl font-semibold text-ink">Users & Access</h1>
          <p className="mt-1 text-sm text-muted">
            Create accounts and activate or deactivate users.
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

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search name or email…"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          className="field min-w-[200px] flex-1"
        />
        <select
          value={filters.role}
          onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
          className="field w-auto"
        >
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <select
          value={filters.isActive}
          onChange={(e) =>
            setFilters((f) => ({ ...f, isActive: e.target.value }))
          }
          className="field w-auto"
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-panel">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableBodySkeleton rows={5} cols={5} />
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
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
                minLength={2}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="field"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Email
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="field"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              {editing ? 'New password (optional)' : 'Password'}
              <input
                type="password"
                required={!editing}
                minLength={6}
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                className="field"
                placeholder={editing ? 'Leave blank to keep current' : ''}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Role
              <select
                required
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="field"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
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
