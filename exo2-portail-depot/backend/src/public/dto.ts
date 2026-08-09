import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import type { RequestStatus } from '@/domain/request-status'

// La vue d'une piece est identique des deux cotes : elle est definie une fois,
// dans le module requests, et reexportee ici plutot que dupliquee.
export type { DepositFileView } from '@/requests/dto'

export const unlockSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'Code a quatre chiffres.'),
})

export class UnlockDto extends createZodDto(unlockSchema) {}

/**
 * Vue publique d'une demande : strictement ce dont le deposant anonyme a besoin
 * pour comprendre ce qu'on lui demande. Ni identifiant interne, ni token, ni
 * liste des pieces deja deposees — il n'a pas a savoir ce que d'autres ont envoye.
 */
export interface PublicRequestView {
  label: string
  status: RequestStatus
  expiresAt: string
  expectedFiles: number
  uploadedCount: number
  cabinetName: string
}

/** Avant deverrouillage, on n'expose que de quoi rassurer sur la provenance du lien. */
export interface PublicPreviewView {
  label: string
  cabinetName: string
}

export interface UnlockResponse {
  depositToken: string
  request: PublicRequestView
}
