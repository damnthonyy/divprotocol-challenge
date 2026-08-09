import { z } from 'zod'

/**
 * Contrat d'environnement. Une variable manquante ou aberrante fait echouer le
 * demarrage, pas la premiere requete qui en a besoin — sur un deploiement
 * one-click, un service qui demarre a moitie coute plus cher qu'un service qui
 * refuse de demarrer en le disant.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

  // Deux secrets distincts, jamais le meme : un jeton de depot anonyme ne doit
  // pas pouvoir etre presente comme un jeton avocat, et inversement.
  JWT_SECRET: z.string().min(32, 'Au moins 32 caracteres.'),
  JWT_EXPIRES_IN: z.string().default('12h'),
  DEPOSIT_JWT_SECRET: z.string().min(32, 'Au moins 32 caracteres.'),
  DEPOSIT_JWT_EXPIRES_IN: z.string().default('30m'),

  // Stockage objet : parametres S3 standard. Aucun nom de variable specifique a MinIO,
  // basculer d'implementation ne doit rien changer d'autre que ces valeurs.
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  // MinIO et la plupart des S3 auto-heberges n'acceptent pas le style virtual-host.
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),

  MAX_FILE_SIZE: z.coerce.number().int().positive().default(20 * 1024 * 1024),

  // Politique PIN : alignee sur ce que le frontend affiche deja.
  PIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  PIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw)

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(racine)'} : ${issue.message}`)
      .join('\n')
    throw new Error(`Configuration invalide :\n${details}`)
  }

  return result.data
}
