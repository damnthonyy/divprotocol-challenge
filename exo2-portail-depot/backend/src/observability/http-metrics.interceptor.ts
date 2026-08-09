import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Request, Response } from 'express'
import { Histogram } from 'prom-client'
import { Observable, tap } from 'rxjs'

import { METRIC } from './metrics'

/**
 * Mesure la duree des requetes HTTP.
 *
 * Le label `route` porte le MOTIF de route (`/public/:token/files`) et jamais
 * l'URL concrete. Utiliser `req.url` creerait une serie temporelle par token
 * public : la cardinalite exploserait en quelques jours et Prometheus
 * s'effondrerait bien avant de rendre le moindre service.
 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric(METRIC.httpDuration) private readonly duration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle()

    const http = context.switchToHttp()
    const request = http.getRequest<Request>()
    const response = http.getResponse<Response>()

    // Les sondes interrogees toutes les cinq a quinze secondes ecraseraient les
    // vraies requetes dans les agregats.
    if (request.path === '/health' || request.path === '/metrics') return next.handle()

    const stop = this.duration.startTimer({
      method: request.method,
      route: routePattern(request),
    })

    // `tap` couvre les deux branches : une requete en erreur a une duree, et
    // c'est meme celle qui interesse le plus.
    return next.handle().pipe(
      tap({
        next: () => stop({ status: String(response.statusCode) }),
        error: (error: { status?: number }) => stop({ status: String(error?.status ?? 500) }),
      }),
    )
  }
}

/** Motif Express (`/requests/:id`), avec repli sur un libelle borne. */
function routePattern(request: Request): string {
  const route = (request as Request & { route?: { path?: string } }).route
  if (route?.path) return route.path

  // Requete n'ayant atteint aucun handler (404, rejet en amont). On renvoie une
  // valeur constante plutot que l'URL demandee : sinon un balayage d'URLs
  // aleatoires suffirait a saturer Prometheus.
  return '(inconnue)'
}
