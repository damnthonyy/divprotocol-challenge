import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'

import type { Env } from '@/config/env.schema'

/**
 * Jeton de session de depot, distinct du JWT avocat.
 *
 * Trois differences volontaires : un secret propre, une audience propre, et une
 * duree courte. Un deposant ne doit jamais detenir un jeton qui ouvre autre
 * chose que son propre depot — meme si les deux secrets etaient identiques par
 * erreur de configuration, l'audience ferait echouer la verification croisee.
 */
export interface DepositJwtPayload {
  sub: string
  /** Token public du lien : le jeton n'est valable que pour celui-ci. */
  token: string
  aud: 'deposit'
}

@Injectable()
export class DepositSessionService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  issue(requestId: string, publicToken: string): Promise<string> {
    const payload: DepositJwtPayload = { sub: requestId, token: publicToken, aud: 'deposit' }

    return this.jwt.signAsync(payload, {
      secret: this.config.get('DEPOSIT_JWT_SECRET', { infer: true }),
      expiresIn: this.config.get('DEPOSIT_JWT_EXPIRES_IN', { infer: true }),
    })
  }

  async verify(rawToken: string, expectedPublicToken: string): Promise<DepositJwtPayload> {
    let payload: DepositJwtPayload

    try {
      payload = await this.jwt.verifyAsync<DepositJwtPayload>(rawToken, {
        secret: this.config.get('DEPOSIT_JWT_SECRET', { infer: true }),
        audience: 'deposit',
      })
    } catch {
      throw new UnauthorizedException({
        message: 'Session de depot expiree. Saisis ton code a nouveau.',
        code: 'DEPOSIT_SESSION_INVALID',
      })
    }

    // Un jeton valide pour un autre lien reste un jeton valide : sans cette
    // verification, quiconque possede un lien pourrait deposer sur tous les autres.
    if (payload.token !== expectedPublicToken) {
      throw new UnauthorizedException({
        message: 'Session de depot invalide.',
        code: 'DEPOSIT_SESSION_MISMATCH',
      })
    }

    return payload
  }
}
