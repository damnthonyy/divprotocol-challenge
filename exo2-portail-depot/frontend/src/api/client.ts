import axios, { AxiosError, type AxiosInstance } from 'axios'
import type { ZodType } from 'zod'

/** Cle de stockage du JWT avocat. Le jeton de depot anonyme vit en memoire seulement. */
const TOKEN_STORAGE_KEY = 'div.portail.accessToken'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_STORAGE_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_STORAGE_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_STORAGE_KEY),
}

/**
 * Erreur normalisee remontee a l'UI. Les composants n'ont jamais a inspecter
 * un AxiosError : ils lisent `status` et `message`.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly details?: unknown

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'Requete invalide.',
  401: 'Session expiree. Reconnecte-toi.',
  403: 'Acces refuse.',
  404: 'Ressource introuvable.',
  410: 'Ce lien a expire.',
  413: 'Fichier trop lourd.',
  429: 'Trop de tentatives. Patiente un instant.',
  500: 'Le serveur a rencontre une erreur.',
}

export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30_000,
})

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; code?: string }>) => {
    const status = error.response?.status ?? 0

    // Un 401 sur une route avocat signifie que le JWT ne vaut plus rien :
    // on le purge ici pour ne pas boucler sur des requetes condamnees.
    if (status === 401) tokenStore.clear()

    const message =
      error.response?.data?.message ??
      DEFAULT_MESSAGES[status] ??
      (status === 0 ? 'Serveur injoignable. Verifie ta connexion.' : 'Une erreur est survenue.')

    return Promise.reject(new ApiError(message, status, error.response?.data?.code))
  },
)

/**
 * Valide la reponse contre son schema zod.
 * Un ecart de contrat echoue ici, pas trois composants plus loin.
 */
export function parse<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.error('Reponse API non conforme au contrat', result.error.issues)
    throw new ApiError('Reponse du serveur inattendue.', 500, 'CONTRACT_MISMATCH', result.error)
  }
  return result.data
}
