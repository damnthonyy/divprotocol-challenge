import { randomBytes, randomInt } from 'node:crypto'

import { Injectable, NotFoundException } from '@nestjs/common'
import * as argon2 from 'argon2'

import { generatePin } from '@/domain/pin-policy'
import { PrismaService } from '@/prisma/prisma.service'

import { toRequestView, type CreateRequestDto, type DepositRequestView } from './dto'

const DAY_MS = 86_400_000

export interface CreatedRequestView extends DepositRequestView {
  /** Le PIN en clair, retourne une seule fois. Il n'est plus relisible ensuite. */
  pin: string
}

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(lawyerId: string): Promise<DepositRequestView[]> {
    const requests = await this.prisma.depositRequest.findMany({
      where: { lawyerId },
      include: { files: { orderBy: { uploadedAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()
    return requests.map((request) => toRequestView(request, now))
  }

  async findOne(lawyerId: string, id: string): Promise<DepositRequestView> {
    const request = await this.prisma.depositRequest.findFirst({
      // `lawyerId` fait partie du filtre, pas d'une verification posterieure :
      // une demande appartenant a un autre cabinet est simplement introuvable.
      // On repond 404 et non 403, pour ne pas confirmer qu'elle existe.
      where: { id, lawyerId },
      include: { files: { orderBy: { uploadedAt: 'asc' } } },
    })

    if (!request) {
      throw new NotFoundException({ message: 'Demande introuvable.', code: 'REQUEST_NOT_FOUND' })
    }

    return toRequestView(request)
  }

  async create(lawyerId: string, input: CreateRequestDto): Promise<CreatedRequestView> {
    const pin = generatePin(randomInt)

    const request = await this.prisma.depositRequest.create({
      data: {
        lawyerId,
        label: input.label,
        expectedFiles: input.expectedFiles,
        pinHash: await argon2.hash(pin),
        // 12 octets aleatoires : ni sequentiel, ni derive de l'id interne.
        // Le lien circule par courriel, il ne doit rien reveler ni etre enumerable.
        publicToken: randomBytes(6).toString('hex'),
        expiresAt: new Date(Date.now() + input.expiresInDays * DAY_MS),
      },
      include: { files: true },
    })

    return { ...toRequestView(request), pin }
  }
}
