import { randomBytes } from 'node:crypto'

import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as argon2 from 'argon2'

import type { Env } from '@/config/env.schema'
import { PrismaService } from '@/prisma/prisma.service'

import type { SessionResponse } from './dto'

/** Charge utile du JWT avocat. `aud` separe ce jeton de celui du deposant. */
export interface LawyerJwtPayload {
  sub: string
  email: string
  aud: 'lawyer'
}

@Injectable()
export class AuthService implements OnModuleInit {
  /**
   * Hachage de reference, verifie quand l'adresse n'existe pas.
   * Sans lui, une adresse inconnue repondrait bien plus vite qu'une adresse
   * connue : l'ecart de temps suffirait a enumerer les comptes du cabinet.
   * Il est calcule au demarrage plutot qu'ecrit en dur, pour rester valide
   * quels que soient les parametres argon2 de la version installee.
   */
  private dummyHash!: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyHash = await argon2.hash(randomBytes(32).toString('hex'))
  }

  async login(email: string, password: string): Promise<SessionResponse> {
    const lawyer = await this.prisma.lawyer.findUnique({ where: { email } })

    const invalid = new UnauthorizedException({
      // Message unique : ne jamais indiquer laquelle des deux valeurs est fausse.
      message: 'Identifiants invalides.',
      code: 'INVALID_CREDENTIALS',
    })

    if (!lawyer) {
      await argon2.verify(this.dummyHash, password).catch(() => false)
      throw invalid
    }

    if (!(await argon2.verify(lawyer.passwordHash, password))) {
      throw invalid
    }

    const payload: LawyerJwtPayload = { sub: lawyer.id, email: lawyer.email, aud: 'lawyer' }

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_EXPIRES_IN', { infer: true }),
    })

    return {
      accessToken,
      lawyer: { id: lawyer.id, email: lawyer.email, name: lawyer.name },
    }
  }
}
