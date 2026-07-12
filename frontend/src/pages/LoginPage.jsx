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
  const [mode, setMode] = useState('login') // login | forgot | reset
  const [role, setRole] = useState('ADMIN')
  const [email, setEmail] = useState('dvpatel6048@gmail.com')
  const [password, setPassword] = useState('password123')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas text-sm text-muted">
        Checking session…
      </div>
    )
  }

  if (token) return <Navigate to="/" replace />

  function switchMode(next) {
    setMode(next)
    setError('')
    setInfo('')
    setLoading(false)
  }

  function handleRoleChange(nextRole) {
    setRole(nextRole)
    const match = ROLE_OPTIONS.find((r) => r.value === nextRole)
    if (match) {
      setEmail(match.email)
      setPassword('password123')
    }
    setError('')
  }

  async function handleLogin(e) {
    e.preventDefault()
    const validationError = firstError(
      validateEmail(email),
      validatePassword(password, 'Password', { min: 6 }),
      required(role, 'Role')
    )
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setInfo('')
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

  async function handleForgot(e) {
    e.preventDefault()
    const validationError = validateEmail(email)
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setInfo('')
    setLoading(true)
    try {
      const data = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim() },
      })
      setInfo(data.message || 'If an account exists, a reset code was sent.')
      setMode('reset')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    const validationError = firstError(
      validateEmail(email),
      required(resetCode, 'Reset code'),
      validatePassword(newPassword, 'New password', { min: 6 })
    )
    if (validationError) {
      setError(validationError)
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setError('')
    setInfo('')
    setLoading(true)
    try {
      const data = await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: {
          email: email.trim(),
          code: resetCode.trim(),
          password: newPassword,
        },
      })
      setInfo(data.message || 'Password updated. You can sign in now.')
      setPassword(newPassword)
      setResetCode('')
      setNewPassword('')
      setConfirmPassword('')
      setMode('login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const title =
    mode === 'forgot'
      ? 'Forgot password'
      : mode === 'reset'
        ? 'Reset password'
        : 'Sign in'
  const subtitle =
    mode === 'forgot'
      ? 'Enter your account email and we will send a 6-digit reset code.'
      : mode === 'reset'
        ? 'Enter the code from your email and choose a new password.'
        : 'Enter your credentials, then confirm your role to continue.'

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
          Accounts lock after 5 failed sign-in attempts. Use Forgot Password to
          recover access.
        </p>
      </section>

      <section className="relative flex items-center justify-center bg-canvas px-6 py-12 lg:px-14">
        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>
        <form
          onSubmit={
            mode === 'forgot'
              ? handleForgot
              : mode === 'reset'
                ? handleReset
                : handleLogin
          }
          className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-xl shadow-black/10 sm:p-8"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
            Welcome back
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="mt-4 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
              {info}
            </p>
          ) : null}

          <label className="mt-8 flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="field"
            />
          </label>

          {mode === 'login' ? (
            <>
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label
                    htmlFor="login-password"
                    className="text-sm font-semibold text-ink"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="field"
                />
              </div>

              <label className="mt-4 flex flex-col gap-1.5 text-sm font-semibold text-ink">
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
            </>
          ) : null}

          {mode === 'forgot' ? (
            <>
              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full rounded-lg bg-accent px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Sending…' : 'Send reset code'}
              </button>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="mt-3 w-full rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:border-accent/50"
              >
                Back to sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode('reset')}
                className="mt-3 w-full text-center text-xs font-semibold text-accent hover:underline"
              >
                Already have a code? Reset password
              </button>
            </>
          ) : null}

          {mode === 'reset' ? (
            <>
              <label className="mt-4 flex flex-col gap-1.5 text-sm font-semibold text-ink">
                Reset code
                <input
                  type="text"
                  inputMode="numeric"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  required
                  placeholder="6-digit code"
                  className="field tracking-widest"
                />
              </label>
              <label className="mt-4 flex flex-col gap-1.5 text-sm font-semibold text-ink">
                New password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="field"
                />
              </label>
              <label className="mt-4 flex flex-col gap-1.5 text-sm font-semibold text-ink">
                Confirm password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="field"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full rounded-lg bg-accent px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="mt-3 w-full rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:border-accent/50"
              >
                Back to sign in
              </button>
            </>
          ) : null}
        </form>
      </section>
    </div>
  )
}
