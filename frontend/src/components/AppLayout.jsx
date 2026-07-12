import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import { getNavLinksForRole } from '../constants/roles'
import ThemeToggle from './ThemeToggle'

const navClass = ({ isActive }) =>
  [
    'rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
    isActive
      ? 'bg-accent/20 text-accent'
      : 'text-muted hover:bg-accent/10 hover:text-ink',
  ].join(' ')

export default function AppLayout() {
  const { user, logout, ready } = useAuth()
  const { rbac } = useOrg()
  const navigate = useNavigate()
  const links = getNavLinksForRole(user?.role, rbac)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas text-sm text-muted">
        Checking session…
      </div>
    )
  }

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-4 border-b border-line bg-sidebar px-4 py-4 text-ink lg:h-full lg:w-[250px] lg:gap-6 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:py-6">
        <div className="flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-sm font-bold text-white shadow-md shadow-orange-500/30">
            TO
          </span>
          <div>
            <p className="font-semibold leading-tight">TransitOps</p>
            <p className="text-xs text-muted">Operations Console</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-x-visible">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-panel/95 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-xs text-muted">Signed in as</p>
            <p className="font-semibold text-ink">{user?.name || 'User'}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <ThemeToggle />
            <span className="rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
              {user?.role?.replaceAll('_', ' ')}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:border-accent/50"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
