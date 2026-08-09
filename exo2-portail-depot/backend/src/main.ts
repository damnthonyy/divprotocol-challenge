import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'

import { AppModule } from './app.module'
import type { Env } from './config/env.schema'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
  })

  const config = app.get(ConfigService<Env, true>)
  const logger = new Logger('Bootstrap')

  // PAS de setGlobalPrefix('api') : nginx reecrit deja `/api/(.*)` vers `/$1`
  // avant de nous transmettre la requete. Ajouter le prefixe ici donnerait /api/api.

  // Le proxy frontal est le seul intermediaire de confiance : sans cela, `req.ip`
  // vaudrait l'adresse du proxy pour toutes les requetes, et le journal d'audit
  // n'aurait plus aucune valeur.
  app.set('trust proxy', 1)

  // CORS inutile en production : le frontend et l'API sont servis sous la meme
  // origine. En developpement, Vite tourne sur un autre port.
  if (config.get('NODE_ENV', { infer: true }) === 'development') {
    app.enableCors({ origin: 'http://localhost:5173', credentials: true })
  }

  app.enableShutdownHooks()

  const port = config.get('PORT', { infer: true })
  await app.listen(port, '0.0.0.0')

  logger.log(`API prete sur le port ${port}.`)
}

void bootstrap()
