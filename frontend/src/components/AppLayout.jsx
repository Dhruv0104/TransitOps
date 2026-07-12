import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/vehicles', label: 'Vehicles' },
  { to: '/drivers', label: 'Drivers' },
  { to: '/trips', label: 'Trips' },
  { to: '/maintenance', label: 'Maintenance' },
  { to: '/expenses', label: 'Fuel & Expenses' },
  { to: '/reports', label: 'Reports' },
]

const navClass = ({ isActive }) =>
  [
    'rounded-lg px-3.5 py-2.5 text-sm transition-colors whitespace-nowrap',
    isActive
      ? 'bg-white/10 text-white'
      : 'text-slate-300 hover:bg-white/10 hover:text-white',
  ].join(' ')

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 z-10 flex flex-col gap-6 bg-sidebar px-4 py-6 text-slate-100 lg:min-h-screen">
        <div className="flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-sm font-bold text-white">
            TO
          </span>
          <div>
            <p className="font-semibold leading-tight">TransitOps</p>
            <p className="text-xs text-slate-400">Smart Transport Ops</p>
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

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line bg-surface/80 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-xs text-muted">Signed in as</p>
            <p className="font-semibold">{user?.name || 'User'}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
              {user?.role?.replaceAll('_', ' ')}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
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
