import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

import type { Env } from '@/config/env.schema'
import { PrismaService } from '@/prisma/prisma.service'

import type { LawyerJwtPayload } from './auth.service'

/** Identite attachee a la requete apres authentification. */
export interface AuthenticatedLawyer {
  id: string
  email: string
  name: string
  cabinetName: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
      // Refuse un jeton de depot presente comme un jeton avocat, meme si les
      // deux secrets venaient a etre identiques par erreur de configuration.
      audience: 'lawyer',
    })
  }

  async validate(payload: LawyerJwtPayload): Promise<AuthenticatedLawyer> {
    // Le compte est relu a chaque requete : un avocat supprime ne doit pas
    // continuer a travailler jusqu'a l'expiration naturelle de son jeton.
    const lawyer = await this.prisma.lawyer.findUnique({ where: { id: payload.sub } })

    if (!lawyer) {
      throw new UnauthorizedException({ message: 'Session invalide.', code: 'UNKNOWN_LAWYER' })
    }

    return {
      id: lawyer.id,
      email: lawyer.email,
      name: lawyer.name,
      cabinetName: lawyer.cabinetName,
    }
  }
}
