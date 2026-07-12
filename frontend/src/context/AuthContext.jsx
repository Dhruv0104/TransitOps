import { createContext, useContext, useMemo, useState } from 'react'

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

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth)

  const value = useMemo(
    () => ({
      token: auth.token,
      user: auth.user,
      login: (next) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        setAuth(next)
      },
      logout: () => {
        localStorage.removeItem(STORAGE_KEY)
        setAuth({ token: null, user: null })
      },
    }),
    [auth]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
