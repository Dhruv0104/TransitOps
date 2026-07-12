import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getNavLinksForRole } from '../constants/roles'

const navClass = ({ isActive }) =>
  [
    'rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
    isActive
      ? 'bg-accent/20 text-accent'
      : 'text-slate-400 hover:bg-white/5 hover:text-white',
  ].join(' ')

export default function AppLayout() {
  const { user, logout, ready } = useAuth()
  const navigate = useNavigate()
  const links = getNavLinksForRole(user?.role)

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
    <div className="grid min-h-screen lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 z-10 flex flex-col gap-6 border-r border-line bg-sidebar px-4 py-6 text-slate-100 lg:min-h-screen">
        <div className="flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-sm font-bold text-white shadow-md shadow-orange-500/30">
            TO
          </span>
          <div>
            <p className="font-semibold leading-tight">TransitOps</p>
            <p className="text-xs text-slate-500">Operations Console</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col bg-canvas">
        <header className="flex items-center justify-between gap-4 border-b border-line bg-panel/80 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-xs text-muted">Signed in as</p>
            <p className="font-semibold text-ink">{user?.name || 'User'}</p>
          </div>
          <div className="flex items-center gap-3">
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
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
