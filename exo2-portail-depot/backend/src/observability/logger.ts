import { randomUUID } from 'node:crypto'

import type { Params } from 'nestjs-pino'
import type { Env } from '@/config/env.schema'

/**
 * Journalisation structuree.
 *
 * JSON en production : les logs sont destines a etre collectes, pas lus a l'oeil.
 * Rendu lisible en developpement, ou c'est l'inverse.
 *
 * La redaction n'est pas un detail de confort : sans elle, un jeton de depot ou
 * un en-tete Authorization se retrouve en clair dans les journaux, qui n'ont pas
 * le meme niveau de protection que la base.
 */
export function loggerOptions(env: Env): Params {
  const isProduction = env.NODE_ENV === 'production'

  return {
    pinoHttp: {
      level: env.LOG_LEVEL,

      transport: isProduction
        ? undefined
        : { target: 'pino-pretty', options: { singleLine: true, translateTime: 'HH:MM:ss' } },

      // Identifiant de correlation : permet de recoller toutes les lignes d'une
      // meme requete, et il est renvoye au client pour qu'un incident signale
      // soit retrouvable.
      genReqId: (req, res) => {
        const existing = req.headers['x-request-id']
        const id = typeof existing === 'string' ? existing : randomUUID()
        res.setHeader('x-request-id', id)
        return id
      },

      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers["x-deposit-token"]',
          'req.headers.cookie',
          'req.body.password',
          'req.body.pin',
        ],
        remove: true,
      },

      // Une 4xx est un comportement attendu, pas un incident : elle ne doit pas
      // declencher les memes alertes qu'une 5xx.
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) return 'error'
        if (res.statusCode >= 400) return 'warn'
        return 'info'
      },

      // Les sondes interrogees toutes les cinq secondes noieraient tout le reste.
      autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === '/metrics',
      },
    },
  }
}
