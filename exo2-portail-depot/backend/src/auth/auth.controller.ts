import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'

import { AuthService } from './auth.service'
import { LoginDto, type SessionResponse } from './dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * `200` et non `201` : une connexion ne cree pas de ressource, et le frontend
   * ne lit que le corps de la reponse.
   *
   * Debit plus serre que le reste de l'API : c'est la porte d'entree du cabinet.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() body: LoginDto): Promise<SessionResponse> {
    return this.auth.login(body.email, body.password)
  }
}
