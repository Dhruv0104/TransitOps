import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import { FormPageSkeleton } from '../components/Skeleton'
import {
  email as validateEmail,
  firstError,
  required,
} from '../lib/validation'
import {
  RBAC_MODULES,
  accessLabel,
  cycleAccess,
  DEFAULT_RBAC,
} from '../constants/roles'

const DISTANCE_UNITS = ['km', 'mi']
const CURRENCY_TYPES = ['INR', 'USD', 'EUR', 'GBP', 'AED']

const EMPTY_ORG = {
  name: '',
  address: '',
  contactNo: '',
  email: '',
  depotName: '',
  distanceUnit: 'km',
  currencyType: 'INR',
}

export default function SettingsPage() {
  const { token } = useAuth()
  const { refresh: refreshOrg } = useOrg()
  const [org, setOrg] = useState(EMPTY_ORG)
  const [rbac, setRbac] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orgSaving, setOrgSaving] = useState(false)
  const [rbacSaving, setRbacSaving] = useState(false)
  const [orgSaved, setOrgSaved] = useState(false)
  const [rbacSaved, setRbacSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest('/settings', { token })
      const o = data.organization || {}
      setOrg({
        name: o.name || '',
        address: o.address || '',
        contactNo: o.contactNo || '',
        email: o.email || '',
        depotName: o.depotName || '',
        distanceUnit: o.distanceUnit || 'km',
        currencyType: o.currencyType || 'INR',
      })
      setRbac(
        Array.isArray(data.rbac) && data.rbac.length ? data.rbac : DEFAULT_RBAC
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  async function saveOrganization(e) {
    e.preventDefault()
    const validationError = firstError(
      required(org.name, 'Organization name'),
      org.email ? validateEmail(org.email, 'Email') : '',
      required(org.distanceUnit, 'Distance unit'),
      required(org.currencyType, 'Currency type')
    )
    if (validationError) {
      setError(validationError)
      return
    }

    setOrgSaving(true)
    setOrgSaved(false)
    setError('')
    try {
      await apiRequest('/settings/organization', {
        method: 'PUT',
        token,
        body: org,
      })
      await refreshOrg()
      setOrgSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setOrgSaving(false)
    }
  }

  function cycleRbacCell(role, moduleKey) {
    setRbac((rows) =>
      rows.map((row) =>
        row.role === role
          ? { ...row, [moduleKey]: cycleAccess(row[moduleKey] || 'none') }
          : row
      )
    )
    setRbacSaved(false)
  }

  async function saveRbac() {
    setRbacSaving(true)
    setRbacSaved(false)
    setError('')
    try {
      const data = await apiRequest('/settings/rbac', {
        method: 'PUT',
        token,
        body: { rbac },
      })
      setRbac(Array.isArray(data.rbac) ? data.rbac : rbac)
      await refreshOrg()
      setRbacSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setRbacSaving(false)
    }
  }

  if (loading) {
    return <FormPageSkeleton />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Organization profile and role-based access control.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold text-ink">Organization Details</h2>
          <p className="mt-1 text-sm text-muted">
            Company identity shown across the operations console.
          </p>

          <form onSubmit={saveOrganization} className="mt-5 space-y-4">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Organization Name
              <input
                required
                value={org.name}
                onChange={(e) => setOrg((o) => ({ ...o, name: e.target.value }))}
                className="field"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Address
              <textarea
                rows={2}
                value={org.address}
                onChange={(e) =>
                  setOrg((o) => ({ ...o, address: e.target.value }))
                }
                className="field"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Contact No.
              <input
                value={org.contactNo}
                onChange={(e) =>
                  setOrg((o) => ({ ...o, contactNo: e.target.value }))
                }
                className="field"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Email
              <input
                type="email"
                value={org.email}
                onChange={(e) => setOrg((o) => ({ ...o, email: e.target.value }))}
                className="field"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Depot Name
              <input
                value={org.depotName}
                onChange={(e) =>
                  setOrg((o) => ({ ...o, depotName: e.target.value }))
                }
                className="field"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Distance Unit
              <select
                value={org.distanceUnit}
                onChange={(e) =>
                  setOrg((o) => ({ ...o, distanceUnit: e.target.value }))
                }
                className="field"
              >
                {DISTANCE_UNITS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'km' ? 'Kilometers (km)' : 'Miles (mi)'}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Currency Type
              <select
                value={org.currencyType}
                onChange={(e) =>
                  setOrg((o) => ({ ...o, currencyType: e.target.value }))
                }
                className="field"
              >
                {CURRENCY_TYPES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={orgSaving}
                className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-500 disabled:opacity-70"
              >
                {orgSaving ? 'Saving…' : 'Save changes'}
              </button>
              {orgSaved ? (
                <span className="text-sm text-emerald-400">Saved</span>
              ) : null}
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-line bg-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold uppercase tracking-wide text-ink">
                Role-Based Access (RBAC)
              </h2>
              <p className="mt-1 text-sm text-muted">
                Click a cell to cycle: full (✓) → view → none (—). Super Admin always has full access.
              </p>
            </div>
            <button
              type="button"
              onClick={saveRbac}
              disabled={rbacSaving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-70"
            >
              {rbacSaving ? 'Saving…' : 'Save RBAC'}
            </button>
          </div>
          {rbacSaved ? (
            <p className="mt-2 text-sm text-emerald-500">RBAC matrix saved</p>
          ) : null}

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-3 font-semibold">Role</th>
                  {RBAC_MODULES.map((mod) => (
                    <th
                      key={mod.key}
                      className="px-3 py-3 text-center font-semibold"
                    >
                      {mod.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rbac
                  .filter((row) => row.role !== 'ADMIN')
                  .map((row) => (
                    <tr
                      key={row.role}
                      className="border-b border-line/70 last:border-0"
                    >
                      <td className="px-3 py-3.5 font-medium text-ink">
                        {row.label ||
                          String(row.role || '').replaceAll('_', ' ')}
                      </td>
                      {RBAC_MODULES.map((mod) => {
                        const level = row[mod.key] || 'none'
                        const label = accessLabel(level)
                        const tone =
                          level === 'full'
                            ? 'text-emerald-500'
                            : level === 'view'
                              ? 'text-sky-500'
                              : 'text-muted'
                        return (
                          <td key={mod.key} className="px-3 py-3.5 text-center">
                            <button
                              type="button"
                              title={`Click to change (${level})`}
                              onClick={() => cycleRbacCell(row.role, mod.key)}
                              className={`min-w-[2.5rem] rounded-md px-2 py-1 text-sm font-semibold transition hover:bg-surface ${tone}`}
                            >
                              {label}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
