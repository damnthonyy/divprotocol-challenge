import { api, parse, tokenStore } from './client'
import { sessionSchema, type LoginInput, type Session } from './schemas'

export async function login(input: LoginInput): Promise<Session> {
  const { data } = await api.post('/auth/login', input)
  const session = parse(sessionSchema, data)
  tokenStore.set(session.accessToken)
  return session
}

export function logout(): void {
  tokenStore.clear()
}

export function hasStoredSession(): boolean {
  return tokenStore.get() !== null
}
