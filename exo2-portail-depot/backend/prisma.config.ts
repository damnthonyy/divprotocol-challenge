import 'dotenv/config'

import { defineConfig, env } from 'prisma/config'

/**
 * Prisma 7 sort la configuration du schema : l'URL de connexion utilisee par le
 * CLI (migrations, seed) est declaree ici, celle du runtime passe par le driver
 * adapter dans src/prisma/prisma.service.ts.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
