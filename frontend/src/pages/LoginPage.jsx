import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { token, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('fleet@transitops.local')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (token) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      login({ token: data.token, user: data.user })
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col gap-3.5 rounded-2xl border border-line bg-surface p-7 shadow-[0_18px_40px_rgba(28,36,48,0.08)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">
          TransitOps
        </p>
        <h1 className="text-2xl font-semibold text-ink">Sign in</h1>
        <p className="text-sm text-muted">
          Manage fleet, trips, maintenance, and costs.
        </p>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-lg border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-lg border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-xs text-muted">
          Demo: fleet@transitops.local / password123 (after seed)
        </p>
      </form>
    </div>
  )
}
