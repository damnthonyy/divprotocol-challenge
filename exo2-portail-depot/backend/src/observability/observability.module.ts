import { Global, Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { TerminusModule } from '@nestjs/terminus'
import { PrometheusModule } from '@willsoto/nestjs-prometheus'

import { HealthController } from './health.controller'
import { HttpMetricsInterceptor } from './http-metrics.interceptor'
import { metricsProviders } from './metrics'
import { MetricsRefresherService } from './metrics-refresher.service'

/**
 * Observabilite : `/health`, `/metrics`, et les metriques metier.
 *
 * Module global parce que les compteurs sont injectes la ou l'action se produit —
 * dans les services d'authentification, de deverrouillage et de depot. Les
 * importer un a un dans chaque module ne ferait qu'ajouter du bruit.
 *
 * Le raisonnement derriere le CHOIX de chaque metrique est documente dans
 * metrics.ts, et resume dans le README.
 */
@Global()
@Module({
  imports: [
    TerminusModule,
    PrometheusModule.register({
      path: '/metrics',
      // Metriques du process Node (memoire, event loop, descripteurs). Utiles au
      // diagnostic, mais aucune n'alerte : sur un serveur partage, la pression
      // memoire ne nous appartient pas.
      defaultMetrics: { enabled: true },
    }),
  ],
  controllers: [HealthController],
  providers: [
    ...metricsProviders,
    MetricsRefresherService,
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
  ],
  exports: [...metricsProviders],
})
export class ObservabilityModule {}
