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

const OrgContext = createContext(null)

export function OrgProvider({ children }) {
  const { token } = useAuth()
  const [currencyType, setCurrencyType] = useState('INR')
  const [distanceUnit, setDistanceUnit] = useState('km')
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    if (!token) {
      setCurrencyType('INR')
      setDistanceUnit('km')
      setReady(true)
      return
    }
    try {
      const data = await apiRequest('/settings/preferences', { token })
      setCurrencyType(data.currencyType || 'INR')
      setDistanceUnit(data.distanceUnit || 'km')
    } catch {
      setCurrencyType('INR')
      setDistanceUnit('km')
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
      currencySymbol: currencySymbol(currencyType),
      formatMoney,
      ready,
      refresh,
    }),
    [currencyType, distanceUnit, formatMoney, ready, refresh]
  )

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg() {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within OrgProvider')
  return ctx
}
