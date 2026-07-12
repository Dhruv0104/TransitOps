import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { apiRequest } from '../api/client'
import { useAuth } from './AuthContext'
import { currencySymbol, formatMoney as formatMoneyBase } from '../lib/currency'
import { DEFAULT_RBAC } from '../constants/roles'

const OrgContext = createContext(null)

export function OrgProvider({ children }) {
  const { token } = useAuth()
  const [currencyType, setCurrencyType] = useState('INR')
  const [distanceUnit, setDistanceUnit] = useState('km')
  const [rbac, setRbac] = useState(DEFAULT_RBAC)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    if (!token) {
      setCurrencyType('INR')
      setDistanceUnit('km')
      setRbac(DEFAULT_RBAC)
      setReady(true)
      return
    }
    try {
      const data = await apiRequest('/settings/preferences', { token })
      setCurrencyType(data.currencyType || 'INR')
      setDistanceUnit(data.distanceUnit || 'km')
      setRbac(Array.isArray(data.rbac) && data.rbac.length ? data.rbac : DEFAULT_RBAC)
    } catch {
      setCurrencyType('INR')
      setDistanceUnit('km')
      setRbac(DEFAULT_RBAC)
    } finally {
      setReady(true)
    }
  }, [token])

  useEffect(() => {
    setReady(false)
    refresh()
  }, [refresh])

  const formatMoney = useCallback(
    (amount, options) => formatMoneyBase(amount, currencyType, options),
    [currencyType]
  )

  const value = useMemo(
    () => ({
      currencyType,
      distanceUnit,
      rbac,
      currencySymbol: currencySymbol(currencyType),
      formatMoney,
      ready,
      refresh,
    }),
    [currencyType, distanceUnit, rbac, formatMoney, ready, refresh]
  )

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg() {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within OrgProvider')
  return ctx
}
