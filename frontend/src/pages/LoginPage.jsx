import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ThemeToggle'
import {
  email as validateEmail,
  firstError,
  password as validatePassword,
  required,
} from '../lib/validation'

const HIGHLIGHTS = [
  {
    title: 'Unified fleet control',
    desc: 'Register vehicles, track status, and keep utilization visible in one console.',
  },
  {
    title: 'Safer driver operations',
    desc: 'License expiry checks, safety scores, and duty status before every dispatch.',
  },
  {
    title: 'Smarter trip dispatch',
    desc: 'Map-based routes with cargo capacity validation from draft to completion.',
  },
  {
    title: 'Cost & performance insight',
    desc: 'Fuel, maintenance, ROI charts, plus CSV and PDF exports for reviews.',
  },
]

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin', email: 'dvpatel6048@gmail.com' },
  {
    value: 'FLEET_MANAGER',
    label: 'Fleet Manager',
    email: 'patelromil.surajnagar@gmail.com',
  },
  {
    value: 'DISPATCHER',
    label: 'Dispatcher',
    email: 'nazneenpatel189@gmail.com',
  },
  {
    value: 'SAFETY_OFFICER',
    label: 'Safety Officer',
    email: 'nehapatel200512@gmail.com',
  },
  {
    value: 'FINANCIAL_ANALYST',
    label: 'Financial Analyst',
    email: 'echoflex2024@gmail.com',
  },
]

export default function LoginPage() {
  const { token, login, ready } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState('ADMIN')
  const [email, setEmail] = useState('dvpatel6048@gmail.com')
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
    const validationError = firstError(
      required(role, 'Role'),
      validateEmail(email),
      validatePassword(password, 'Password', { min: 6 })
    )
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setLoading(true)
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password },
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
      <section className="relative flex flex-col justify-between overflow-hidden bg-sidebar px-8 py-10 text-ink lg:px-14 lg:py-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 15% 10%, rgba(249,115,22,0.22), transparent 42%), radial-gradient(ellipse at 90% 85%, rgba(56,189,248,0.12), transparent 40%)',
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-lg font-bold text-white shadow-lg shadow-orange-500/30">
              TO
            </span>
            <div>
              <p className="text-xl font-bold tracking-tight">TransitOps</p>
              <p className="text-sm text-muted">Smart Transport Operations</p>
            </div>
          </div>

          <p className="mt-12 text-xs font-bold uppercase tracking-[0.18em] text-accent">
            Built for fleet teams
          </p>
          <h2 className="mt-3 max-w-md text-3xl font-semibold tracking-tight lg:text-4xl">
            Run vehicles, drivers, and dispatch from one operations console.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
            TransitOps helps you digitize day-to-day fleet work — from registry and
            compliance to trips, maintenance, fuel costs, and analytics.
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map((item, index) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-muted">
          Demo access ready — choose a role on the right to auto-fill credentials.
        </p>
      </section>

      <section className="relative flex items-center justify-center bg-canvas px-6 py-12 lg:px-14">
        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-xl shadow-black/10 sm:p-8"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
            Welcome back
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Sign in</h1>
          <p className="mt-2 text-sm text-muted">
            Choose your role to load the demo account, then sign in.
          </p>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <label className="mt-8 flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Role
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="field"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="field"
            />
          </label>

          <label className="mt-4 flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="field"
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
            Demo password for all roles:{' '}
            <span className="font-semibold text-ink">password123</span>
          </p>
        </form>
      </section>
    </div>
  )
}
