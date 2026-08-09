import {
  UnauthorizedException,
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

import type { AuthenticatedLawyer } from './jwt.strategy'

/**
 * Garde des routes avocat.
 *
 * `handleRequest` est surcharge pour ne pas laisser passer le « Unauthorized »
 * par defaut de Passport : le frontend affiche `data.message` tel quel, et un
 * message anglais apparaitrait dans une interface entierement francaise.
 */
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T = AuthenticatedLawyer>(err: unknown, user: T | false): T {
    if (err || !user) {
      throw new UnauthorizedException({
        message: 'Session expiree. Reconnecte-toi.',
        code: 'UNAUTHENTICATED',
      })
    }
    return user
  }
}

/** Injecte l'avocat authentifie dans un handler. */
export const CurrentLawyer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedLawyer => {
    return context.switchToHttp().getRequest<{ user: AuthenticatedLawyer }>().user
  },
)
