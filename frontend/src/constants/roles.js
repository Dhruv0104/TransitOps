export const ROLES = {
  ADMIN: 'ADMIN',
  FLEET_MANAGER: 'FLEET_MANAGER',
  DISPATCHER: 'DISPATCHER',
  SAFETY_OFFICER: 'SAFETY_OFFICER',
  FINANCIAL_ANALYST: 'FINANCIAL_ANALYST',
}

export const ACCESS_LEVELS = ['none', 'view', 'full']

export const RBAC_MODULES = [
  { key: 'fleet', label: 'Fleet' },
  { key: 'drivers', label: 'Drivers' },
  { key: 'trips', label: 'Trips' },
  { key: 'fuel', label: 'Fuel/Exp.' },
  { key: 'analytics', label: 'Analytics' },
]

/** Default matrix (no Super Admin) — matches Settings RBAC table */
export const DEFAULT_RBAC = [
  {
    role: ROLES.FLEET_MANAGER,
    label: 'Fleet Manager',
    fleet: 'full',
    drivers: 'full',
    trips: 'none',
    fuel: 'none',
    analytics: 'full',
  },
  {
    role: ROLES.DISPATCHER,
    label: 'Dispatcher',
    fleet: 'view',
    drivers: 'none',
    trips: 'full',
    fuel: 'none',
    analytics: 'none',
  },
  {
    role: ROLES.SAFETY_OFFICER,
    label: 'Safety Officer',
    fleet: 'none',
    drivers: 'full',
    trips: 'view',
    fuel: 'none',
    analytics: 'none',
  },
  {
    role: ROLES.FINANCIAL_ANALYST,
    label: 'Financial Analyst',
    fleet: 'view',
    drivers: 'none',
    trips: 'none',
    fuel: 'full',
    analytics: 'full',
  },
]

/** Which routes belong to each RBAC module */
export const MODULE_ROUTES = {
  fleet: ['/vehicles', '/maintenance'],
  drivers: ['/drivers'],
  trips: ['/trips'],
  fuel: ['/expenses'],
  analytics: ['/reports'],
}

export const NAV_LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/vehicles', label: 'Fleet Registry' },
  { to: '/drivers', label: 'Drivers & Safety' },
  { to: '/trips', label: 'Trip Dispatcher' },
  { to: '/maintenance', label: 'Maintenance' },
  { to: '/expenses', label: 'Fuel and Expenses' },
  { to: '/reports', label: 'Analytics' },
  { to: '/users', label: 'Users & Access' },
  { to: '/settings', label: 'Settings' },
]

export function cycleAccess(current) {
  const idx = ACCESS_LEVELS.indexOf(current)
  return ACCESS_LEVELS[(idx + 1) % ACCESS_LEVELS.length]
}

export function moduleForPath(path) {
  for (const [mod, routes] of Object.entries(MODULE_ROUTES)) {
    if (routes.includes(path)) return mod
  }
  return null
}

export function accessFor(role, moduleKey, rbac = DEFAULT_RBAC) {
  if (role === ROLES.ADMIN) return 'full'
  const row = (rbac || DEFAULT_RBAC).find((r) => r.role === role)
  if (!row) return 'none'
  return ACCESS_LEVELS.includes(row[moduleKey]) ? row[moduleKey] : 'none'
}

export function canAccessRoute(role, path, rbac = DEFAULT_RBAC) {
  if (role === ROLES.ADMIN) return true
  if (path === '/') return true
  if (path === '/users' || path === '/settings') return false

  const mod = moduleForPath(path)
  if (!mod) return false
  const level = accessFor(role, mod, rbac)

  // Maintenance is fleet write-ops only — not shown for fleet "view" roles (e.g. Dispatcher)
  if (path === '/maintenance') return level === 'full'

  return level === 'view' || level === 'full'
}

export function canEditModule(role, moduleKey, rbac = DEFAULT_RBAC) {
  return accessFor(role, moduleKey, rbac) === 'full'
}

export function getNavLinksForRole(role, rbac = DEFAULT_RBAC) {
  return NAV_LINKS.filter((link) => canAccessRoute(role, link.to, rbac))
}

export function accessLabel(level) {
  if (level === 'full') return '✓'
  if (level === 'view') return 'view'
  return '—'
}
