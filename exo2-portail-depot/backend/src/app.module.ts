import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { ZodValidationPipe } from 'nestjs-zod'

import { AuthModule } from './auth/auth.module'
import { HttpExceptionFilter } from './common/http-exception.filter'
import { AppThrottlerGuard } from './common/throttler.guard'
import { ConfigModule } from './config/config.module'
import { PrismaModule } from './prisma/prisma.module'
import { PublicModule } from './public/public.module'
import { RequestsModule } from './requests/requests.module'

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
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
