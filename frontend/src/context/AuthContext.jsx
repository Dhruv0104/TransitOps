import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { apiRequest } from '../api/client'

const AuthContext = createContext(null)

const STORAGE_KEY = 'transitops_auth'

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { token: null, user: null }
  } catch {
    return { token: null, user: null }
  }
}

function persistAuth(next) {
  if (!next?.token) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth)
  const [ready, setReady] = useState(!readStoredAuth().token)

  const login = useCallback((next) => {
    persistAuth(next)
    setAuth(next)
  }, [])

  const logout = useCallback(() => {
    persistAuth(null)
    setAuth({ token: null, user: null })
  }, [])

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      const stored = readStoredAuth()
      if (!stored.token) {
        if (!cancelled) setReady(true)
        return
      }

      try {
        const data = await apiRequest('/auth/me', { token: stored.token })
        if (cancelled) return
        const next = { token: stored.token, user: data.user }
        persistAuth(next)
        setAuth(next)
      } catch {
        if (cancelled) return
        persistAuth(null)
        setAuth({ token: null, user: null })
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    hydrate()
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(
    () => ({
      token: auth.token,
      user: auth.user,
      ready,
      login,
      logout,
    }),
    [auth, ready, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
