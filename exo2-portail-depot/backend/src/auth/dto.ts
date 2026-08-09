import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

/**
 * Miroir de `frontend/src/api/schemas.ts`. La duplication est assumee : sans
 * monorepo, un paquet partage compliquerait le `install.sh` one-click pour un
 * gain limite a trois schemas. Le contrat reste verifie des deux cotes.
 */
export const loginSchema = z.object({
  email: z.email('Adresse electronique invalide.'),
  password: z.string().min(1, 'Mot de passe requis.'),
})

export class LoginDto extends createZodDto(loginSchema) {}

export interface SessionResponse {
  accessToken: string
  lawyer: {
    id: string
    email: string
    name: string
  }
}
