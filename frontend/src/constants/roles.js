export const ROLES = {
  FLEET_MANAGER: 'FLEET_MANAGER',
  DRIVER: 'DRIVER',
  SAFETY_OFFICER: 'SAFETY_OFFICER',
  FINANCIAL_ANALYST: 'FINANCIAL_ANALYST',
}

/** Path → roles allowed to access that page */
export const ROUTE_PERMISSIONS = {
  '/': Object.values(ROLES),
  '/vehicles': [ROLES.FLEET_MANAGER],
  '/drivers': [ROLES.SAFETY_OFFICER],
  '/trips': [ROLES.FLEET_MANAGER, ROLES.DRIVER],
  '/maintenance': [ROLES.FLEET_MANAGER],
  '/expenses': [ROLES.FINANCIAL_ANALYST, ROLES.FLEET_MANAGER],
  '/reports': [ROLES.FINANCIAL_ANALYST, ROLES.FLEET_MANAGER],
}

export const NAV_LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/vehicles', label: 'Vehicles' },
  { to: '/drivers', label: 'Drivers' },
  { to: '/trips', label: 'Trips' },
  { to: '/maintenance', label: 'Maintenance' },
  { to: '/expenses', label: 'Fuel & Expenses' },
  { to: '/reports', label: 'Reports' },
]

export function canAccessRoute(role, path) {
  const allowed = ROUTE_PERMISSIONS[path]
  if (!allowed) return false
  return allowed.includes(role)
}

export function getNavLinksForRole(role) {
  return NAV_LINKS.filter((link) => canAccessRoute(role, link.to))
}
