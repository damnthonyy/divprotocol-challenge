import type { DepositRequest, RequestStatus } from '@/api/schemas'

const DAY = 86_400_000

function iso(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY).toISOString()
}

export interface MockRequest extends DepositRequest {
  /** Le PIN ne quitte jamais le mock : l'API reelle ne le renvoie pas non plus. */
  pin: string
}

/**
 * Jeu de donnees couvrant les trois statuts.
 * L'etat vide se teste en vidant ce tableau (ou via le panneau de simulation).
 */
export const seedRequests: MockRequest[] = [
  {
    id: 'req_001',
    label: 'Dossier Martin, pieces 2026',
    status: 'pending',
    createdAt: iso(-3),
    expiresAt: iso(4),
    expectedFiles: 4,
    publicToken: '8f3a2c1b',
    pin: '4816',
    files: [
      {
        id: 'file_001',
        filename: 'contrat-signe.pdf',
        size: 2_516_582,
        mimeType: 'application/pdf',
        uploadedAt: iso(-2),
      },
      {
        id: 'file_002',
        filename: 'piece-identite.jpg',
        size: 843_776,
        mimeType: 'image/jpeg',
        uploadedAt: iso(-1),
      },
    ],
  },
  {
    id: 'req_002',
    label: 'Succession Lefevre, actes notaries',
    status: 'complete',
    createdAt: iso(-12),
    expiresAt: iso(9),
    expectedFiles: 2,
    publicToken: 'c41d9e77',
    pin: '2093',
    files: [
      {
        id: 'file_003',
        filename: 'acte-notarie.pdf',
        size: 5_242_880,
        mimeType: 'application/pdf',
        uploadedAt: iso(-10),
      },
      {
        id: 'file_004',
        filename: 'attestation-propriete.pdf',
        size: 1_048_576,
        mimeType: 'application/pdf',
        uploadedAt: iso(-9),
      },
    ],
  },
  {
    id: 'req_003',
    label: 'Contentieux Duval, factures 2025',
    status: 'expired',
    createdAt: iso(-40),
    expiresAt: iso(-11),
    expectedFiles: 6,
    publicToken: 'a09b3f52',
    pin: '7734',
    files: [
      {
        id: 'file_005',
        filename: 'facture-mars.pdf',
        size: 204_800,
        mimeType: 'application/pdf',
        uploadedAt: iso(-38),
      },
    ],
  },
]

export const seedLawyer = {
  id: 'lawyer_001',
  email: 'avocat@divprotocol.com',
  name: 'Maitre Rousseau',
  password: 'demo1234',
  cabinetName: 'Cabinet Rousseau & Associes',
}

export function computeStatus(request: MockRequest): RequestStatus {
  if (new Date(request.expiresAt).getTime() <= Date.now()) return 'expired'
  return request.files.length >= request.expectedFiles ? 'complete' : 'pending'
}
