import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  {
    title: 'Fleet Management',
    desc: 'Track vehicles, status, and utilization in one place.',
  },
  {
    title: 'Compliance',
    desc: 'Monitor license validity and safety scores.',
  },
  {
    title: 'Dispatch & Trips',
    desc: 'Assign vehicles and drivers with capacity checks.',
  },
  {
    title: 'Financial Reports',
    desc: 'Fuel, maintenance cost, ROI, and CSV exports.',
  },
]

const ROLE_OPTIONS = [
  {
    value: 'ADMIN',
    label: 'Admin',
    email: 'admin@transitops.local',
  },
  {
    value: 'FLEET_MANAGER',
    label: 'Fleet Manager',
    email: 'fleet@transitops.local',
  },
  {
    value: 'DISPATCHER',
    label: 'Dispatcher',
    email: 'dispatcher@transitops.local',
  },
  {
    value: 'SAFETY_OFFICER',
    label: 'Safety Officer',
    email: 'safety@transitops.local',
  },
  {
    value: 'FINANCIAL_ANALYST',
    label: 'Financial Analyst',
    email: 'finance@transitops.local',
  },
]

export default function LoginPage() {
  const { token, login, ready } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState('ADMIN')
  const [email, setEmail] = useState('admin@transitops.local')
  const [password, setPassword] = useState('password123')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas text-sm text-muted">
        Checking session…
      </div>
    )
  }

  if (token) return <Navigate to="/" replace />

  function handleRoleChange(nextRole) {
    setRole(nextRole)
    const match = ROLE_OPTIONS.find((r) => r.value === nextRole)
    if (match) {
      setEmail(match.email)
      setPassword('password123')
    }
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      })

      if (data.user?.role !== role) {
        throw new Error(
          `This account is ${data.user.role.replaceAll('_', ' ')}, not ${role.replaceAll('_', ' ')}. Pick the matching role.`
        )
      }

      login({ token: data.token, user: data.user })
      void remember
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative flex flex-col justify-between bg-[#e8eaed] px-8 py-10 text-slate-800 lg:px-14 lg:py-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #fff 0, transparent 40%), radial-gradient(circle at 80% 80%, #cbd5e1 0, transparent 35%)',
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-lg font-bold text-white shadow-lg shadow-orange-500/30">
              TO
            </span>
            <div>
              <p className="text-xl font-bold tracking-tight text-slate-900">
                TransitOps
              </p>
              <p className="text-sm text-slate-500">Smart Transport Operations</p>
            </div>
          </div>

          <h2 className="mt-12 text-3xl font-semibold tracking-tight text-slate-900">
            Key App Features
          </h2>
          <ul className="mt-8 space-y-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
                <div>
                  <p className="font-semibold text-slate-900">{f.title}</p>
                  <p className="text-sm text-slate-600">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">
          Digitizing fleet, dispatch, maintenance & cost control.
        </p>
      </section>

      <section className="flex items-center justify-center bg-canvas px-6 py-12 lg:px-14">
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
            Welcome back
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">
            Sign in to your account
          </h1>
          <p className="mt-2 text-sm text-muted">
            Select your role, then sign in with your credentials.
          </p>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <label className="mt-8 flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Role
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-2.5 font-normal text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleRoleChange(opt.value)}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                  role === opt.value
                    ? 'border-accent bg-accent/20 text-accent'
                    : 'border-line bg-surface text-muted hover:border-accent/40 hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label className="mt-4 flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-lg border border-line bg-surface px-3 py-2.5 font-normal text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          </label>

          <label className="mt-4 flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-lg border border-line bg-surface px-3 py-2.5 font-normal text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          </label>

          <label className="mt-4 flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded border-line accent-orange-500"
            />
            Remember me
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-accent px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <p className="mt-4 text-xs text-muted">
            Choosing a role fills the demo account. Password for all:{' '}
            <span className="text-ink">password123</span>
          </p>
        </form>
      </section>
    </div>
  )
}
