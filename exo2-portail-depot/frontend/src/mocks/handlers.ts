import { HttpResponse, delay, http } from 'msw'

import { MAX_FILE_SIZE, validateFile } from '@/lib/file'

import { computeStatus, seedLawyer, seedRequests, type MockRequest } from './fixtures'

const BASE = '/api'

/** Etat mutable du mock, reinitialisable depuis le panneau de simulation. */
let requests: MockRequest[] = structuredClone(seedRequests)
let idCounter = requests.length

/** Tentatives de PIN par token, pour reproduire le verrouillage attendu cote back. */
const pinAttempts = new Map<string, number>()
const MAX_PIN_ATTEMPTS = 5

/** Sessions de depot ouvertes : depositToken -> token public. */
const depositSessions = new Map<string, string>()

export interface ChaosConfig {
  /** Latence artificielle, en ms, sur toutes les routes. */
  latencyMs: number
  /** Le dashboard renvoie une 500 : sert a voir l'etat d'erreur. */
  failDashboard: boolean
  /** Le dashboard renvoie une liste vide : sert a voir l'etat vide. */
  emptyDashboard: boolean
  /** Un envoi de fichier sur deux echoue a mi-parcours. */
  flakyUpload: boolean
}

export const chaos: ChaosConfig = {
  latencyMs: 400,
  failDashboard: false,
  emptyDashboard: false,
  flakyUpload: false,
}

export function resetMockState() {
  requests = structuredClone(seedRequests)
  idCounter = requests.length
  pinAttempts.clear()
  depositSessions.clear()
}

/** Vue publique d'une demande : le PIN est retire, sauf a la creation. */
function serialize(request: MockRequest) {
  const { pin, ...rest } = request
  return { ...rest, status: computeStatus(request) }
}

function requireAuth(headers: Headers) {
  return headers.get('Authorization')?.startsWith('Bearer ') ?? false
}

let uploadCount = 0

export const handlers = [
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    await delay(chaos.latencyMs)
    const body = (await request.json()) as { email?: string; password?: string }

    if (body.email !== seedLawyer.email || body.password !== seedLawyer.password) {
      return HttpResponse.json({ message: 'Identifiants invalides.' }, { status: 401 })
    }

    return HttpResponse.json({
      accessToken: `mock.jwt.${Date.now()}`,
      lawyer: { id: seedLawyer.id, email: seedLawyer.email, name: seedLawyer.name },
    })
  }),

  http.get(`${BASE}/requests`, async ({ request }) => {
    await delay(chaos.latencyMs)
    if (!requireAuth(request.headers)) {
      return HttpResponse.json({ message: 'Non authentifie.' }, { status: 401 })
    }
    if (chaos.failDashboard) {
      return HttpResponse.json({ message: 'Base de donnees injoignable.' }, { status: 500 })
    }
    if (chaos.emptyDashboard) {
      return HttpResponse.json([])
    }
    return HttpResponse.json(requests.map(serialize))
  }),

  http.get(`${BASE}/requests/:id`, async ({ request, params }) => {
    await delay(chaos.latencyMs)
    if (!requireAuth(request.headers)) {
      return HttpResponse.json({ message: 'Non authentifie.' }, { status: 401 })
    }
    const found = requests.find((item) => item.id === params.id)
    if (!found) return HttpResponse.json({ message: 'Demande introuvable.' }, { status: 404 })
    return HttpResponse.json(serialize(found))
  }),

  http.post(`${BASE}/requests`, async ({ request }) => {
    await delay(chaos.latencyMs)
    if (!requireAuth(request.headers)) {
      return HttpResponse.json({ message: 'Non authentifie.' }, { status: 401 })
    }

    const body = (await request.json()) as {
      label: string
      expectedFiles: number
      expiresInDays: number
    }

    idCounter += 1
    const pin = String(Math.floor(1000 + Math.random() * 9000))
    const created: MockRequest = {
      id: `req_${String(idCounter).padStart(3, '0')}`,
      label: body.label,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + body.expiresInDays * 86_400_000).toISOString(),
      expectedFiles: body.expectedFiles,
      publicToken: Math.random().toString(16).slice(2, 10),
      pin,
      files: [],
    }

    requests = [created, ...requests]
    return HttpResponse.json({ ...serialize(created), pin }, { status: 201 })
  }),

  http.get(`${BASE}/public/:token`, async ({ params }) => {
    await delay(chaos.latencyMs)
    const found = requests.find((item) => item.publicToken === params.token)
    if (!found) return HttpResponse.json({ message: 'Lien inconnu.' }, { status: 404 })
    if (computeStatus(found) === 'expired') {
      return HttpResponse.json({ message: 'Ce lien a expire.' }, { status: 410 })
    }
    return HttpResponse.json({ label: found.label, cabinetName: seedLawyer.cabinetName })
  }),

  http.post(`${BASE}/public/:token/unlock`, async ({ request, params }) => {
    await delay(chaos.latencyMs)
    const token = String(params.token)
    const found = requests.find((item) => item.publicToken === token)

    if (!found) return HttpResponse.json({ message: 'Lien inconnu.' }, { status: 404 })

    if (computeStatus(found) === 'expired') {
      return HttpResponse.json({ message: 'Ce lien a expire.' }, { status: 410 })
    }

    const attempts = pinAttempts.get(token) ?? 0
    if (attempts >= MAX_PIN_ATTEMPTS) {
      return HttpResponse.json(
        { message: 'Trop de codes errones. Le lien est verrouille.' },
        { status: 429 },
      )
    }

    const body = (await request.json()) as { pin?: string }
    if (body.pin !== found.pin) {
      pinAttempts.set(token, attempts + 1)
      const left = MAX_PIN_ATTEMPTS - attempts - 1
      return HttpResponse.json(
        { message: `Code incorrect. ${left} tentative${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''}.` },
        { status: 403 },
      )
    }

    pinAttempts.delete(token)
    const depositToken = `deposit.${token}.${Date.now()}`
    depositSessions.set(depositToken, token)

    return HttpResponse.json({
      depositToken,
      request: {
        label: found.label,
        status: computeStatus(found),
        expiresAt: found.expiresAt,
        expectedFiles: found.expectedFiles,
        uploadedCount: found.files.length,
        cabinetName: seedLawyer.cabinetName,
      },
    })
  }),

  http.post(`${BASE}/public/:token/files`, async ({ request, params }) => {
    const token = String(params.token)
    const depositToken = request.headers.get('X-Deposit-Token')

    if (!depositToken || depositSessions.get(depositToken) !== token) {
      return HttpResponse.json({ message: 'Session de depot invalide.' }, { status: 403 })
    }

    const found = requests.find((item) => item.publicToken === token)
    if (!found) return HttpResponse.json({ message: 'Lien inconnu.' }, { status: 404 })
    if (computeStatus(found) === 'expired') {
      return HttpResponse.json({ message: 'Ce lien a expire.' }, { status: 410 })
    }

    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return HttpResponse.json({ message: 'Aucun fichier recu.' }, { status: 400 })
    }

    // Latence proportionnelle au poids : la barre de progression a le temps de vivre.
    await delay(Math.min(2500, 600 + file.size / 4000))

    if (file.size > MAX_FILE_SIZE) {
      return HttpResponse.json({ message: 'Fichier trop lourd. 20 Mo maximum.' }, { status: 413 })
    }

    const rejection = validateFile(file)
    if (rejection) {
      return HttpResponse.json({ message: rejection.message }, { status: 415 })
    }

    uploadCount += 1
    if (chaos.flakyUpload && uploadCount % 2 === 0) {
      return HttpResponse.json(
        { message: 'Le stockage objet a refuse le fichier.' },
        { status: 502 },
      )
    }

    const stored = {
      id: `file_${Math.random().toString(16).slice(2, 8)}`,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
    }

    found.files = [...found.files, stored]
    return HttpResponse.json(stored, { status: 201 })
  }),
]
