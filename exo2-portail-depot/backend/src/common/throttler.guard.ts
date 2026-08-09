import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler'

/**
 * Limitation de debit avec une reponse exploitable par l'interface.
 *
 * Deux raisons de ne pas garder le comportement par defaut :
 *
 *  1. le message brut est « ThrottlerException: Too Many Requests », affiche tel
 *     quel par le frontend dans une interface entierement francaise ;
 *  2. surtout, le verrouillage du PIN repond lui aussi en `429`. Sans code
 *     distinct, l'interface ne peut pas differencier « ralentis » de « ce lien
 *     est verrouille », et afficherait une impasse definitive pour une limite
 *     qui se leve en une minute.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    _context: unknown,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const seconds = Math.max(1, Math.ceil(detail.timeToBlockExpire))

    throw new HttpException(
      {
        message: `Trop de requetes. Reessaie dans ${seconds} seconde${seconds > 1 ? 's' : ''}.`,
        code: 'RATE_LIMITED',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    )
  }
}
