import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common'
import type { Request } from 'express'

import { DepositSessionService, type DepositJwtPayload } from './deposit-session.service'

export const DEPOSIT_TOKEN_HEADER = 'x-deposit-token'

interface RequestWithDeposit extends Request {
  deposit?: DepositJwtPayload
}

/**
 * Protege les routes de depot. Verifie que l'en-tete `X-Deposit-Token` porte une
 * session valide **et** qu'elle correspond bien au `:token` de l'URL appelee.
 */
@Injectable()
export class DepositTokenGuard implements CanActivate {
  constructor(private readonly sessions: DepositSessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithDeposit>()
    const rawToken = request.headers[DEPOSIT_TOKEN_HEADER]

    if (typeof rawToken !== 'string' || rawToken.length === 0) {
      throw new UnauthorizedException({
        message: 'Session de depot requise.',
        code: 'DEPOSIT_SESSION_MISSING',
      })
    }

    const publicToken = String(request.params.token ?? '')
    request.deposit = await this.sessions.verify(rawToken, publicToken)

    return true
  }
}

/** Injecte la session de depot validee dans un handler. */
export const CurrentDeposit = createParamDecorator(
  (_data: unknown, context: ExecutionContext): DepositJwtPayload => {
    const request = context.switchToHttp().getRequest<RequestWithDeposit>()
    if (!request.deposit) throw new UnauthorizedException('Session de depot absente.')
    return request.deposit
  },
)
