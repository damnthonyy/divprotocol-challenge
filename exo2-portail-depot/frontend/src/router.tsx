import { Navigate, Route, Routes } from 'react-router'

import { AppShell } from './components/layout/app-shell'
import { useAuth } from './hooks/use-auth'
import { LoginPage } from './features/auth/login-page'
import { DashboardPage } from './features/requests/dashboard-page'
import { RequestDetailPage } from './features/requests/request-detail-page'
import { DepositPage } from './features/deposit/deposit-page'
import { NotFoundPage } from './features/misc/not-found-page'
import { KitPage } from './features/misc/kit-page'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Espace avocat */}
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/requests/:id" element={<RequestDetailPage />} />
      </Route>

      {/* Parcours client anonyme : ni AppShell ni garde d'authentification. */}
      <Route path="/d/:token" element={<DepositPage />} />

      {/* Ecran de controle visuel du design system, hors produit. */}
      <Route path="/kit" element={<KitPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
