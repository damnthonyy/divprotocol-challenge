import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'

import type { Env } from '@/config/env.schema'

/**
 * Client Prisma branche via le driver adapter PostgreSQL (Prisma 7).
 * Le pool `pg` est detenu ici pour pouvoir etre ferme proprement a l'arret :
 * sans cela, un redemarrage laisse des connexions ouvertes cote base.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)
  private readonly pool: Pool

  constructor(config: ConfigService<Env, true>) {
    const pool = new Pool({ connectionString: config.get('DATABASE_URL', { infer: true }) })
    super({ adapter: new PrismaPg(pool) })
    this.pool = pool
  }

  async onModuleInit(): Promise<void> {
    await this.$connect()
    this.logger.log('Connexion a la base etablie.')
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
    await this.pool.end()
  }
}
