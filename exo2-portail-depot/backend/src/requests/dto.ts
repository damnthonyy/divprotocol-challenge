import type { DepositFile, DepositRequest } from '@prisma/client'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { computeStatus, type RequestStatus } from '@/domain/request-status'

export const createRequestSchema = z.object({
  label: z
    .string()
    .trim()
    .min(3, 'Trois caracteres minimum.')
    .max(120, 'Cent vingt caracteres maximum.'),
  expectedFiles: z
    .number('Nombre attendu.')
    .int('Nombre entier attendu.')
    .min(1, 'Au moins une piece.')
    .max(50, 'Cinquante pieces maximum.'),
  expiresInDays: z
    .number('Nombre attendu.')
    .int('Nombre entier attendu.')
    .min(1, 'Au moins un jour.')
    .max(30, 'Trente jours maximum.'),
})

export class CreateRequestDto extends createZodDto(createRequestSchema) {}

export interface DepositFileView {
  id: string
  filename: string
  size: number
  mimeType: string
  uploadedAt: string
}

export interface DepositRequestView {
  id: string
  label: string
  status: RequestStatus
  createdAt: string
  expiresAt: string
  expectedFiles: number
  files: DepositFileView[]
  publicToken: string
}

type RequestWithFiles = DepositRequest & { files: DepositFile[] }

function toFileView(file: DepositFile): DepositFileView {
  return {
    id: file.id,
    filename: file.filename,
    size: file.size,
    mimeType: file.mimeType,
    uploadedAt: file.uploadedAt.toISOString(),
  }
}

/**
 * Projection vers le contrat public.
 *
 * Deux responsabilites, et c'est le seul endroit ou elles sont assurees :
 * le statut est calcule ici (il n'existe pas en base), et `pinHash` comme les
 * compteurs de verrouillage sont exclus par construction — on liste les champs
 * a exposer plutot que d'en retirer, pour qu'une colonne ajoutee demain ne fuite
 * pas par accident.
 */
export function toRequestView(request: RequestWithFiles, now: Date = new Date()): DepositRequestView {
  return {
    id: request.id,
    label: request.label,
    status: computeStatus(
      {
        expiresAt: request.expiresAt,
        uploadedCount: request.files.length,
        expectedFiles: request.expectedFiles,
        revokedAt: request.revokedAt,
      },
      now,
    ),
    createdAt: request.createdAt.toISOString(),
    expiresAt: request.expiresAt.toISOString(),
    expectedFiles: request.expectedFiles,
    files: request.files.map(toFileView),
    publicToken: request.publicToken,
  }
}
