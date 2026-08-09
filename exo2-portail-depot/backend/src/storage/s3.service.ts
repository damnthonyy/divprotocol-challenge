import { Readable } from 'node:stream'

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import type { Env } from '@/config/env.schema'

export interface PutObjectArgs {
  key: string
  body: Buffer | Readable
  contentType: string
  /** Nom d'origine, restitue au telechargement via Content-Disposition. */
  filename: string
}

/**
 * Acces au stockage objet.
 *
 * Ce fichier n'utilise QUE l'API S3 standard, via l'AWS SDK. Aucun import,
 * aucun appel, aucun nom de variable specifique a MinIO. C'est deliberé :
 * MinIO Community Edition est archive depuis avril 2026, et basculer vers
 * SeaweedFS, Garage ou un S3 souverain doit rester un changement de
 * configuration, pas une reecriture.
 */
@Injectable()
export class S3Service implements OnModuleDestroy {
  private readonly logger = new Logger(S3Service.name)
  private readonly client: S3Client
  private readonly bucket: string

  constructor(config: ConfigService<Env, true>) {
    this.bucket = config.get('S3_BUCKET', { infer: true })

    this.client = new S3Client({
      endpoint: config.get('S3_ENDPOINT', { infer: true }),
      region: config.get('S3_REGION', { infer: true }),
      // MinIO et la plupart des S3 auto-heberges n'exposent pas de sous-domaines
      // par bucket : sans ce reglage, le SDK forge des URLs inatteignables.
      forcePathStyle: config.get('S3_FORCE_PATH_STYLE', { infer: true }),
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY', { infer: true }),
        secretAccessKey: config.get('S3_SECRET_KEY', { infer: true }),
      },
    })
  }

  onModuleDestroy(): void {
    this.client.destroy()
  }

  /** Sonde utilisee par le healthcheck : le bucket est-il joignable ? */
  async ping(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }))
  }

  /**
   * Envoie un objet.
   * `Upload` decoupe automatiquement en multipart au-dela du seuil : le contenu
   * n'a jamais besoin d'etre entierement materialise ailleurs qu'en memoire, et
   * rien n'est ecrit sur le disque local de l'application.
   */
  async put({ key, body, contentType, filename }: PutObjectArgs): Promise<void> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })

    await upload.done()
  }

  /**
   * URL de telechargement temporaire.
   * Le contenu ne transite pas par l'API : c'est le stockage qui sert le fichier,
   * l'application ne fait que signer l'autorisation.
   */
  presignDownload(key: string, expiresInSeconds = 300): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    })
  }

  async delete(key: string): Promise<void> {
    await this.client
      .send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
      .catch((error: unknown) => {
        // Un objet orphelin est genant, pas bloquant : on journalise et on
        // laisse l'appelant poursuivre son nettoyage.
        this.logger.warn(`Suppression de ${key} impossible : ${String(error)}`)
      })
  }
}
