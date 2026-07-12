import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { OrgProvider, useOrg } from './context/OrgContext'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import VehiclesPage from './pages/VehiclesPage'
import DriversPage from './pages/DriversPage'
import TripsPage from './pages/TripsPage'
import MaintenancePage from './pages/MaintenancePage'
import ExpensesPage from './pages/ExpensesPage'
import ReportsPage from './pages/ReportsPage'
import UsersPage from './pages/UsersPage'
import SettingsPage from './pages/SettingsPage'
import { canAccessRoute } from './constants/roles'

function ProtectedRoute({ children }) {
  const { token, ready } = useAuth()
  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted">
        Checking session…
      </div>
    )
  }
  if (!token) return <Navigate to="/login" replace />
  return children
}

function RoleRoute({ path, children }) {
  const { user } = useAuth()
  const { rbac } = useOrg()
  if (!canAccessRoute(user?.role, path, rbac)) {
    return <Navigate to="/" replace />
  }
  return children
}

function App() {
  return (
    <AuthProvider>
      <OrgProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={
                <RoleRoute path="/">
                  <DashboardPage />
                </RoleRoute>
              }
            />
            <Route
              path="vehicles"
              element={
                <RoleRoute path="/vehicles">
                  <VehiclesPage />
                </RoleRoute>
              }
            />
            <Route
              path="drivers"
              element={
                <RoleRoute path="/drivers">
                  <DriversPage />
                </RoleRoute>
              }
            />
            <Route
              path="trips"
              element={
                <RoleRoute path="/trips">
                  <TripsPage />
                </RoleRoute>
              }
            />
            <Route
              path="maintenance"
              element={
                <RoleRoute path="/maintenance">
                  <MaintenancePage />
                </RoleRoute>
              }
            />
            <Route
              path="expenses"
              element={
                <RoleRoute path="/expenses">
                  <ExpensesPage />
                </RoleRoute>
              }
            />
            <Route
              path="reports"
              element={
                <RoleRoute path="/reports">
                  <ReportsPage />
                </RoleRoute>
              }
            />
            <Route
              path="users"
              element={
                <RoleRoute path="/users">
                  <UsersPage />
                </RoleRoute>
              }
            />
            <Route
              path="settings"
              element={
                <RoleRoute path="/settings">
                  <SettingsPage />
                </RoleRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </OrgProvider>
    </AuthProvider>
  )
}

export default App
