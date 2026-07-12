export const ROLES = {
  ADMIN: 'ADMIN',
  FLEET_MANAGER: 'FLEET_MANAGER',
  DISPATCHER: 'DISPATCHER',
  SAFETY_OFFICER: 'SAFETY_OFFICER',
  FINANCIAL_ANALYST: 'FINANCIAL_ANALYST',
}

/** Path → roles allowed to access that page */
export const ROUTE_PERMISSIONS = {
  '/': Object.values(ROLES),
  '/vehicles': [ROLES.ADMIN, ROLES.FLEET_MANAGER],
  '/drivers': [ROLES.ADMIN, ROLES.SAFETY_OFFICER],
  '/trips': [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.DISPATCHER],
  '/maintenance': [ROLES.ADMIN, ROLES.FLEET_MANAGER],
  '/expenses': [ROLES.ADMIN, ROLES.FINANCIAL_ANALYST, ROLES.FLEET_MANAGER],
  '/reports': [ROLES.ADMIN, ROLES.FINANCIAL_ANALYST, ROLES.FLEET_MANAGER],
  '/users': [ROLES.ADMIN],
  '/settings': [ROLES.ADMIN],
}

export const NAV_LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/vehicles', label: 'Fleet Registry' },
  { to: '/drivers', label: 'Drivers & Safety' },
  { to: '/trips', label: 'Trip Dispatcher' },
  { to: '/maintenance', label: 'Maintenance' },
  { to: '/expenses', label: 'Fuel & Energy' },
  { to: '/reports', label: 'Analytics' },
  { to: '/users', label: 'Users & Access' },
  { to: '/settings', label: 'Settings' },
]

export function canAccessRoute(role, path) {
  if (role === ROLES.ADMIN) return true
  const allowed = ROUTE_PERMISSIONS[path]
  if (!allowed) return false
  return allowed.includes(role)
}

export function getNavLinksForRole(role) {
  return NAV_LINKS.filter((link) => canAccessRoute(role, link.to))
}
