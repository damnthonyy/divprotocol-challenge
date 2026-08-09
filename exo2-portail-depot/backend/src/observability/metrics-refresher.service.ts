import { readFile } from 'node:fs/promises'
import { X509Certificate } from 'node:crypto'

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import { Counter, Gauge } from 'prom-client'

import { computeStatus } from '@/domain/request-status'
import { PrismaService } from '@/prisma/prisma.service'

import { METRIC } from './metrics'

/** Delai au-dela duquel une piece restee a `pending` n'est plus un envoi en cours. */
const PENDING_GRACE_MS = 5 * 60_000

const REFRESH_INTERVAL_MS = 60_000

/**
 * Rafraichit les jauges qui decrivent un etat plutot qu'un evenement.
 *
 * Un compteur s'incremente la ou l'action se produit ; une jauge doit etre relue
 * periodiquement. Une minute suffit largement : ces valeurs bougent lentement, et
 * interroger la base plus souvent couterait plus que ce que ca rapporte.
 */
@Injectable()
export class MetricsRefresherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsRefresherService.name)
  private timer?: ReturnType<typeof setInterval>

  constructor(
    private readonly prisma: PrismaService,
    @InjectMetric(METRIC.inconsistentFiles) private readonly inconsistentFiles: Gauge<string>,
    @InjectMetric(METRIC.tlsCertExpiryDays) private readonly certExpiryDays: Gauge<string>,
    @InjectMetric(METRIC.activeRequests) private readonly activeRequests: Gauge<string>,
    @InjectMetric(METRIC.uploadTotal) private readonly uploadTotal: Counter<string>,
    @InjectMetric(METRIC.pinAttemptTotal) private readonly pinAttempts: Counter<string>,
    @InjectMetric(METRIC.loginTotal) private readonly loginTotal: Counter<string>,
    @InjectMetric(METRIC.linkLockedTotal) private readonly linksLocked: Counter<string>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.initialiseCounters()
    await this.refresh()
    this.timer = setInterval(() => void this.refresh(), REFRESH_INTERVAL_MS)
    // Sans `unref`, ce minuteur retient la boucle d'evenements et le conteneur
    // met une minute a s'arreter a chaque redeploiement.
    this.timer.unref()
  }

  /**
   * Cree a zero toutes les combinaisons de labels connues.
   *
   * Ce n'est pas cosmetique, c'est ce qui rend les alertes fonctionnelles.
   *
   * Sans cela, une serie apparait directement a sa premiere valeur — trois
   * echecs de stockage font surgir `portail_upload_total{outcome="storage_error"}`
   * a 3. Prometheus n'a jamais observe la valeur precedente, donc
   * `increase(...[5m])` vaut ZERO et la regle ne se declenche pas.
   *
   * Autrement dit : sans cette initialisation, la toute premiere panne — celle
   * qui compte le plus — passe inapercue, et l'alerte ne se reveille qu'a la
   * deuxieme. Verifie en conditions reelles avant d'etre corrige ici.
   */
  private initialiseCounters(): void {
    for (const outcome of ['success', 'rejected_type', 'rejected_size', 'storage_error']) {
      this.uploadTotal.inc({ outcome }, 0)
    }
    for (const outcome of ['succeeded', 'failed', 'locked']) {
      this.pinAttempts.inc({ outcome }, 0)
    }
    for (const outcome of ['succeeded', 'failed']) {
      this.loginTotal.inc({ outcome }, 0)
    }
    this.linksLocked.inc(0)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  private async refresh(): Promise<void> {
    // Une sonde qui plante ne doit jamais faire tomber l'application : on
    // journalise et on reessaiera dans une minute.
    await Promise.allSettled([
      this.refreshInconsistentFiles(),
      this.refreshRequestStatuses(),
      this.refreshCertificateExpiry(),
    ])
  }

  /**
   * Compte les pieces enregistrees sans objet derriere.
   *
   * `objectKey = 'pending'` est la valeur posee AVANT l'envoi vers le stockage,
   * puis remplacee par la vraie cle. Une ligne qui la porte encore au-dela du
   * delai de grace signale un envoi interrompu entre les deux ecritures : la
   * piece apparait cote avocat, son contenu n'existe nulle part.
   */
  private async refreshInconsistentFiles(): Promise<void> {
    try {
      const count = await this.prisma.depositFile.count({
        where: {
          objectKey: 'pending',
          uploadedAt: { lt: new Date(Date.now() - PENDING_GRACE_MS) },
        },
      })

      this.inconsistentFiles.set(count)

      if (count > 0) {
        this.logger.error(
          `${count} piece(s) enregistree(s) sans contenu dans le stockage objet. ` +
            "Un client croit avoir depose un document que le cabinet n'a pas.",
        )
      }
    } catch (error) {
      this.logger.warn(`Sonde de coherence indisponible : ${String(error)}`)
    }
  }

  private async refreshRequestStatuses(): Promise<void> {
    try {
      const requests = await this.prisma.depositRequest.findMany({
        select: {
          expiresAt: true,
          expectedFiles: true,
          revokedAt: true,
          _count: { select: { files: true } },
        },
      })

      const tally = { pending: 0, complete: 0, expired: 0 }
      const now = new Date()

      for (const request of requests) {
        const status = computeStatus(
          {
            expiresAt: request.expiresAt,
            uploadedCount: request._count.files,
            expectedFiles: request.expectedFiles,
            revokedAt: request.revokedAt,
          },
          now,
        )
        tally[status] += 1
      }

      for (const [status, value] of Object.entries(tally)) {
        this.activeRequests.set({ status }, value)
      }
    } catch (error) {
      this.logger.warn(`Sonde des statuts indisponible : ${String(error)}`)
    }
  }

  /**
   * Lit la date d'expiration du certificat servi par l'edge.
   *
   * Le fichier est monte en lecture seule dans le conteneur en production ; hors
   * production il est absent.
   *
   * Le `remove()` est essentiel et non cosmetique : prom-client initialise toute
   * jauge sans label a ZERO et l'expose des le demarrage. Sans lui, la regle
   * « moins de 20 jours restants » se declencherait en permanence en local et en
   * CI — et une alerte qui hurle en continu est une alerte que l'on desactive,
   * donc une alerte perdue le jour ou elle aurait compte. Supprimer la serie fait
   * que la regle n'a simplement rien a evaluer.
   */
  private async refreshCertificateExpiry(): Promise<void> {
    const path = process.env.TLS_CERT_PATH

    if (!path) {
      this.certExpiryDays.remove()
      return
    }

    try {
      const pem = await readFile(path)
      const certificate = new X509Certificate(pem)
      const remainingMs = new Date(certificate.validTo).getTime() - Date.now()
      this.certExpiryDays.set(Math.floor(remainingMs / 86_400_000))
    } catch (error) {
      this.certExpiryDays.remove()
      this.logger.warn(`Certificat illisible (${path}) : ${String(error)}`)
    }
  }
}
