import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../core/auth/authContext'
import { Badge } from '../ui/components/Badge'
import { Button } from '../ui/components/Button'

export function AppShell() {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="topbar">
        <a href="#contenuto-principale" className="sr-only">
          Vai al contenuto principale
        </a>
        <div className="topbar-inner">
          <div className="row">
            <strong>Viaggi di Gruppo</strong>
            <nav className="topbar-nav" aria-label="Navigazione principale">
              <NavLink to="/trips" className={({ isActive }) => `topbar-link${isActive ? ' active' : ''}`}>
                Viaggi
              </NavLink>
              <NavLink to="/trips/new" className={({ isActive }) => `topbar-link${isActive ? ' active' : ''}`}>
                Nuovo viaggio
              </NavLink>
              <NavLink to="/map" className={({ isActive }) => `topbar-link${isActive ? ' active' : ''}`}>
                Mappa
              </NavLink>
            </nav>
          </div>

          <div className="row">
            {user ? <Badge variant="planned">{user.displayName}</Badge> : null}
            <Button variant="secondary" onClick={logout}>
              Esci
            </Button>
          </div>
        </div>
      </header>

      <main id="contenuto-principale" className="page">
        <Outlet />
      </main>
    </div>
  )
}
