import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'

import { CurrentLawyer, JwtAuthGuard } from '@/auth/current-lawyer.decorator'
import type { AuthenticatedLawyer } from '@/auth/jwt.strategy'

import { CreateRequestDto, type DepositRequestView } from './dto'
import { RequestsService, type CreatedRequestView } from './requests.service'

@Controller('requests')
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get()
  list(@CurrentLawyer() lawyer: AuthenticatedLawyer): Promise<DepositRequestView[]> {
    return this.requests.list(lawyer.id)
  }

  @Get(':id')
  findOne(
    @CurrentLawyer() lawyer: AuthenticatedLawyer,
    @Param('id') id: string,
  ): Promise<DepositRequestView> {
    return this.requests.findOne(lawyer.id, id)
  }

  /** Seule reponse de l'API qui contient le PIN en clair. */
  @Post()
  create(
    @CurrentLawyer() lawyer: AuthenticatedLawyer,
    @Body() body: CreateRequestDto,
  ): Promise<CreatedRequestView> {
    return this.requests.create(lawyer.id, body)
  }
}
