import { createContext, use, useCallback, useMemo, useState, type PropsWithChildren } from 'react'

import { hasStoredSession, login as loginRequest, logout as logoutRequest } from '@/api/auth'
import type { LoginInput, Session } from '@/api/schemas'

interface AuthContextValue {
  lawyer: Session['lawyer'] | null
  isAuthenticated: boolean
  login: (input: LoginInput) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Etat d'authentification volontairement minimal : react-query gere l'etat serveur,
 * ce contexte ne porte que l'identite courante. Le JWT vit dans le tokenStore.
 *
 * Limite assumee : au rechargement, on sait qu'un jeton existe mais pas a qui il
 * appartient tant que le back n'expose pas un GET /auth/me.
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const [lawyer, setLawyer] = useState<Session['lawyer'] | null>(null)
  const [authenticated, setAuthenticated] = useState(hasStoredSession)

  const login = useCallback(async (input: LoginInput) => {
    const session = await loginRequest(input)
    setLawyer(session.lawyer)
    setAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    logoutRequest()
    setLawyer(null)
    setAuthenticated(false)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ lawyer, isAuthenticated: authenticated, login, logout }),
    [lawyer, authenticated, login, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext)
  if (!context) throw new Error('useAuth doit etre utilise dans un AuthProvider.')
  return context
}
