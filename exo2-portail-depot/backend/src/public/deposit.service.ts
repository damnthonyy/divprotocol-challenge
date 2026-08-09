import { createHash } from 'node:crypto'

import { HttpException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AccessEvent } from '@prisma/client'
import { filetypemime } from 'magic-bytes.js'

import type { Env } from '@/config/env.schema'
import { buildObjectKey, validateFile } from '@/domain/file-policy'
import { PrismaService } from '@/prisma/prisma.service'
import { S3Service } from '@/storage/s3.service'

import type { DepositFileView } from './dto'
// PublicService est importe comme valeur et non comme type : `import type` est
// efface a la compilation, et l'injection de dependances de Nest n'a alors plus
// de token a resoudre a l'execution.
import { PublicService, type RequesterContext } from './public.service'

export interface UploadedFileInput {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

@Injectable()
export class DepositService {
  private readonly logger = new Logger(DepositService.name)
  private readonly maxFileSize: number

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly publicService: PublicService,
    config: ConfigService<Env, true>,
  ) {
    this.maxFileSize = config.get('MAX_FILE_SIZE', { infer: true })
  }

  async upload(
    publicToken: string,
    requestId: string,
    file: UploadedFileInput,
    context: RequesterContext,
  ): Promise<DepositFileView> {
    // Rechargee a chaque envoi : un lien peut expirer entre le deverrouillage et
    // le depot de la derniere piece. Leve 410 si ce n'est plus recevable.
    const request = await this.publicService.loadUsable(publicToken)

    // Le jeton de depot porte l'id de la demande, l'URL porte le token public.
    // Les deux doivent designer la meme demande.
    if (request.id !== requestId) {
      await this.publicService.log(request.id, AccessEvent.FILE_REJECTED, context)
      throw new HttpException({ message: 'Session de depot invalide.', code: 'SESSION_MISMATCH' }, 401)
    }

    // Le type reel vient du contenu, jamais de l'extension ni de l'en-tete
    // multipart : les deux sont fournis par le client.
    const detectedMimeTypes = filetypemime(file.buffer)

    const rejection = validateFile(
      {
        filename: file.originalname,
        size: file.size,
        declaredMimeType: file.mimetype,
        detectedMimeTypes,
      },
      this.maxFileSize,
    )

    if (rejection) {
      await this.publicService.log(request.id, AccessEvent.FILE_REJECTED, context)
      throw new HttpException(
        { message: rejection.message, code: rejection.reason.toUpperCase() },
        rejection.status,
      )
    }

    const checksum = createHash('sha256').update(file.buffer).digest('hex')

    // La ligne est creee avant l'envoi pour disposer de son id dans la cle de
    // l'objet, puis supprimee si l'envoi echoue : mieux vaut un objet orphelin
    // dans le bucket qu'une piece listee cote avocat sans contenu derriere.
    const created = await this.prisma.depositFile.create({
      data: {
        requestId: request.id,
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        objectKey: 'pending',
        checksum,
      },
    })

    const objectKey = buildObjectKey(request.id, created.id, file.originalname)

    try {
      await this.s3.put({
        key: objectKey,
        body: file.buffer,
        contentType: file.mimetype,
        filename: file.originalname,
      })
    } catch (error) {
      await this.prisma.depositFile.delete({ where: { id: created.id } }).catch(() => undefined)
      this.logger.error(`Envoi vers le stockage objet echoue pour ${objectKey}`, error as Error)
      throw new HttpException(
        { message: 'Le stockage a refuse le fichier. Reessaie.', code: 'STORAGE_UNAVAILABLE' },
        502,
      )
    }

    const stored = await this.prisma.depositFile.update({
      where: { id: created.id },
      data: { objectKey },
    })

    await this.publicService.log(request.id, AccessEvent.FILE_UPLOADED, context)

    return {
      id: stored.id,
      filename: stored.filename,
      size: stored.size,
      mimeType: stored.mimeType,
      uploadedAt: stored.uploadedAt.toISOString(),
    }
  }
}
