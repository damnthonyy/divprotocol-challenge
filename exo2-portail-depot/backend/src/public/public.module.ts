import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { DepositSessionService } from './deposit-session.service'
import { DepositTokenGuard } from './deposit-token.guard'
import { PublicController } from './public.controller'
import { PublicService } from './public.service'

@Module({
  imports: [JwtModule.register({})],
  controllers: [PublicController],
  providers: [PublicService, DepositSessionService, DepositTokenGuard],
  exports: [PublicService, DepositSessionService],
})
export class PublicModule {}
