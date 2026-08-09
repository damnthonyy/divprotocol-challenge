import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'

import { ApiError } from './api/client'
import { Provider } from './components/ui/provider'
import { Toaster } from './components/ui/toaster'
import { AuthProvider } from './hooks/use-auth'
import { AppRoutes } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Reessayer un 401 ou un 404 ne sert a rien : seules les pannes reseau
      // et les 5xx meritent une seconde chance.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        return failureCount < 2
      },
    },
  },
})

export function App() {
  return (
    <Provider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </Provider>
  )
}
