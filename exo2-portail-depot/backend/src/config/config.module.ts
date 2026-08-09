import { Global, Module } from '@nestjs/common'
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config'

import { validateEnv, type Env } from './env.schema'

/** ConfigService typé sur notre schéma : plus de `configService.get<string>('...')` aveugle. */
export type TypedConfigService = ConfigService<Env, true>

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
