import { z } from 'zod'

/**
 * Contrat d'API cote client. Les reponses sont validees a l'execution :
 * si NestJS devie du contrat, on le voit tout de suite au lieu d'un `undefined`
 * qui remonte trois composants plus loin.
 */

export const requestStatusSchema = z.enum(['pending', 'complete', 'expired'])
export type RequestStatus = z.infer<typeof requestStatusSchema>

export const uploadStateSchema = z.enum(['uploading', 'done', 'error'])
export type UploadState = z.infer<typeof uploadStateSchema>

export const depositFileSchema = z.object({
  id: z.string(),
  filename: z.string(),
  /** Taille en octets, formatee cote UI. */
  size: z.number().int().nonnegative(),
  mimeType: z.string(),
  uploadedAt: z.iso.datetime(),
})
export type DepositFile = z.infer<typeof depositFileSchema>

export const depositRequestSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: requestStatusSchema,
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  /** Nombre de pieces attendues, sert a la ligne "2 pieces sur 4". */
  expectedFiles: z.number().int().positive(),
  files: z.array(depositFileSchema),
  /** Token public du lien de depot. Le PIN n'est jamais renvoye par l'API. */
  publicToken: z.string(),
})
export type DepositRequest = z.infer<typeof depositRequestSchema>

export const depositRequestListSchema = z.array(depositRequestSchema)

/** Reponse de creation : le PIN n'est expose qu'ici, une seule fois. */
export const createdRequestSchema = depositRequestSchema.extend({
  pin: z.string().length(4),
})
export type CreatedRequest = z.infer<typeof createdRequestSchema>

export const createRequestInputSchema = z.object({
  label: z
    .string()
    .trim()
    .min(3, 'Trois caracteres minimum.')
    .max(120, 'Cent vingt caracteres maximum.'),
  // Les inputs number sont enregistres avec `valueAsNumber` : pas de coercion ici,
  // le schema reste utilisable tel quel cote backend.
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
export type CreateRequestInput = z.infer<typeof createRequestInputSchema>

export const loginInputSchema = z.object({
  email: z.email('Adresse electronique invalide.'),
  password: z.string().min(1, 'Mot de passe requis.'),
})
export type LoginInput = z.infer<typeof loginInputSchema>

export const sessionSchema = z.object({
  accessToken: z.string(),
  lawyer: z.object({
    id: z.string(),
    email: z.email(),
    name: z.string(),
  }),
})
export type Session = z.infer<typeof sessionSchema>

/** Vue publique d'une demande : strictement ce dont le deposant anonyme a besoin. */
export const publicRequestSchema = z.object({
  label: z.string(),
  status: requestStatusSchema,
  expiresAt: z.iso.datetime(),
  expectedFiles: z.number().int().positive(),
  uploadedCount: z.number().int().nonnegative(),
  cabinetName: z.string(),
})
export type PublicRequest = z.infer<typeof publicRequestSchema>

export const unlockInputSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'Code a quatre chiffres.'),
})
export type UnlockInput = z.infer<typeof unlockInputSchema>

export const unlockResponseSchema = z.object({
  /** Jeton de session de depot, distinct du JWT avocat. */
  depositToken: z.string(),
  request: publicRequestSchema,
})
export type UnlockResponse = z.infer<typeof unlockResponseSchema>
