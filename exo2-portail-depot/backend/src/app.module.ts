import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { LoggerModule } from 'nestjs-pino'
import { ZodValidationPipe } from 'nestjs-zod'

import { AuthModule } from './auth/auth.module'
import { HttpExceptionFilter } from './common/http-exception.filter'
import { AppThrottlerGuard } from './common/throttler.guard'
import { ConfigModule } from './config/config.module'
import type { Env } from './config/env.schema'
import { loggerOptions } from './observability/logger'
import { ObservabilityModule } from './observability/observability.module'
import { PrismaModule } from './prisma/prisma.module'
import { PublicModule } from './public/public.module'
import { RequestsModule } from './requests/requests.module'
import { StorageModule } from './storage/storage.module'

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        loggerOptions({
          NODE_ENV: config.get('NODE_ENV', { infer: true }),
          LOG_LEVEL: config.get('LOG_LEVEL', { infer: true }),
        } as Env),
    }),
    PrismaModule,
    StorageModule,
    ObservabilityModule,
    // Plafond global volontairement large : les limites serrees sont declarees
    // route par route, la ou elles ont un sens (connexion, deverrouillage).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AuthModule,
    RequestsModule,
    PublicModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
  ],
})
export class AppModule {}
