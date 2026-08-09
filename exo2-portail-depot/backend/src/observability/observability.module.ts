import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { PrometheusModule } from '@willsoto/nestjs-prometheus'

import { HealthController } from './health.controller'

/**
 * Plomberie d'observabilite : `/health` et `/metrics` exposes, logs structures
 * (voir logger.ts).
 *
 * Le CHOIX des metriques metier et des seuils d'alerte est traite a part, et
 * documente dans le README : l'enonce en fait explicitement un critere de
 * discrimination, pas une case a cocher. Ce module ne pose que les rails.
 */
@Module({
  imports: [
    TerminusModule,
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true },
    }),
  ],
  controllers: [HealthController],
})
export class ObservabilityModule {}
