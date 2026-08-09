import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Request } from 'express'

import { UnlockDto, type PublicPreviewView, type UnlockResponse } from './dto'
import { PublicService, type RequesterContext } from './public.service'

function requesterOf(request: Request): RequesterContext {
  return {
    // `req.ip` tient compte de X-Forwarded-For grace a `trust proxy` (voir main.ts) :
    // sans cela, toutes les requetes porteraient l'adresse du reverse proxy.
    ipAddress: request.ip,
    userAgent: request.get('user-agent') ?? undefined,
  }
}

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get(':token')
  preview(@Param('token') token: string, @Req() req: Request): Promise<PublicPreviewView> {
    return this.publicService.preview(token, requesterOf(req))
  }

  /**
   * Le verrouillage persistant en base plafonne les tentatives par lien ; cette
   * limitation de debit plafonne la cadence par adresse. Les deux sont
   * necessaires : la premiere ne freine pas un balayage sur des liens differents,
   * la seconde se contourne en changeant d'adresse.
   *
   * Le plafond est deliberement au-dessus des 5 tentatives autorisees par lien :
   * la defense de premiere ligne doit etre le verrouillage, qui explique au
   * client ce qui se passe. Un client legitime qui se trompe puis redemande un
   * lien ne doit pas se heurter d'abord a une limite anonyme.
   */
  @Post(':token/unlock')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  unlock(
    @Param('token') token: string,
    @Body() body: UnlockDto,
    @Req() req: Request,
  ): Promise<UnlockResponse> {
    return this.publicService.unlock(token, body.pin, requesterOf(req))
  }
}
