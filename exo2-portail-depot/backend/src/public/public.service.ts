import {
  ForbiddenException,
  GoneException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AccessEvent, type DepositRequest } from '@prisma/client'
import * as argon2 from 'argon2'

import type { Env } from '@/config/env.schema'
import {
  registerAttempt,
  rejectionMessage,
  releaseIfExpired,
  type PinPolicyOptions,
} from '@/domain/pin-policy'
import { computeStatus, isLinkUsable } from '@/domain/request-status'
import { PrismaService } from '@/prisma/prisma.service'

import { DepositSessionService } from './deposit-session.service'
import type { PublicPreviewView, PublicRequestView, UnlockResponse } from './dto'

/** Contexte de l'appelant, journalise dans l'audit. */
export interface RequesterContext {
  ipAddress?: string
  userAgent?: string
}

type RequestWithCount = DepositRequest & { _count: { files: number } }

@Injectable()
export class PublicService {
  private readonly pinPolicy: PinPolicyOptions

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: DepositSessionService,
    config: ConfigService<Env, true>,
  ) {
    this.pinPolicy = {
      maxAttempts: config.get('PIN_MAX_ATTEMPTS', { infer: true }),
      lockoutMinutes: config.get('PIN_LOCKOUT_MINUTES', { infer: true }),
    }
  }

  /** Apercu avant deverrouillage : juste de quoi rassurer sur la provenance du lien. */
  async preview(token: string, context: RequesterContext): Promise<PublicPreviewView> {
    const request = await this.loadUsable(token)

    await this.log(request.id, AccessEvent.LINK_VIEWED, context)

    const lawyer = await this.prisma.lawyer.findUniqueOrThrow({
      where: { id: request.lawyerId },
      select: { cabinetName: true },
    })

    return { label: request.label, cabinetName: lawyer.cabinetName }
  }

  async unlock(token: string, pin: string, context: RequesterContext): Promise<UnlockResponse> {
    const request = await this.loadUsable(token)
    const now = new Date()

    // Un verrouillage echu est purge avant d'evaluer la tentative : sans cela, le
    // lien resterait bloque a vie des la premiere erreur suivant le deverrouillage.
    const state = releaseIfExpired(
      { failedAttempts: request.failedPinAttempts, lockedUntil: request.lockedUntil },
      now,
    )

    const isCorrect = await argon2.verify(request.pinHash, pin)
    const result = registerAttempt(state, isCorrect, this.pinPolicy, now)

    if (result.outcome === 'locked') {
      await this.log(request.id, AccessEvent.UNLOCK_LOCKED, context)
      throw new HttpException(
        {
          message: `Trop de codes errones. Reessaie dans ${Math.ceil(result.retryAfterSeconds / 60)} minutes.`,
          code: 'PIN_LOCKED',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    await this.prisma.depositRequest.update({
      where: { id: request.id },
      data: { failedPinAttempts: result.next.failedAttempts, lockedUntil: result.next.lockedUntil },
    })

    if (result.outcome === 'rejected') {
      await this.log(request.id, AccessEvent.UNLOCK_FAILED, context)
      throw new ForbiddenException({
        message: rejectionMessage(result.attemptsLeft),
        code: 'PIN_INVALID',
      })
    }

    await this.log(request.id, AccessEvent.UNLOCK_SUCCEEDED, context)

    return {
      depositToken: await this.sessions.issue(request.id, request.publicToken),
      request: await this.toPublicView(request, now),
    }
  }

  /**
   * Charge une demande par son token public et refuse si le lien n'est plus utilisable.
   *
   * `404` quand le token est inconnu, `410` quand il a expire : la distinction est
   * utile au client, qui doit savoir s'il doit redemander un lien ou verifier
   * l'adresse qu'il a collee.
   */
  async loadUsable(token: string): Promise<RequestWithCount> {
    const request = await this.prisma.depositRequest.findUnique({
      where: { publicToken: token },
      include: { _count: { select: { files: true } } },
    })

    if (!request) {
      throw new NotFoundException({ message: 'Lien inconnu.', code: 'LINK_NOT_FOUND' })
    }

    const usable = isLinkUsable({
      expiresAt: request.expiresAt,
      uploadedCount: request._count.files,
      expectedFiles: request.expectedFiles,
      revokedAt: request.revokedAt,
    })

    if (!usable) {
      throw new GoneException({ message: 'Ce lien a expire.', code: 'LINK_EXPIRED' })
    }

    return request
  }

  async toPublicView(request: RequestWithCount, now = new Date()): Promise<PublicRequestView> {
    const lawyer = await this.prisma.lawyer.findUniqueOrThrow({
      where: { id: request.lawyerId },
      select: { cabinetName: true },
    })

    return {
      label: request.label,
      status: computeStatus(
        {
          expiresAt: request.expiresAt,
          uploadedCount: request._count.files,
          expectedFiles: request.expectedFiles,
          revokedAt: request.revokedAt,
        },
        now,
      ),
      expiresAt: request.expiresAt.toISOString(),
      expectedFiles: request.expectedFiles,
      uploadedCount: request._count.files,
      cabinetName: lawyer.cabinetName,
    }
  }

  /**
   * Journal d'audit. Volontairement non bloquant : un incident d'ecriture de log
   * ne doit pas empecher un client de deposer ses pieces.
   */
  async log(requestId: string, event: AccessEvent, context: RequesterContext): Promise<void> {
    await this.prisma.accessLog
      .create({
        data: {
          requestId,
          event,
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent?.slice(0, 500) ?? null,
        },
      })
      .catch(() => undefined)
  }
}
