/**
 * Regles de recevabilite d'une piece.
 *
 * Le frontend applique deja ces regles (frontend/src/lib/file.ts) pour eviter un
 * aller-retour inutile, mais c'est ici que la decision fait foi : un client peut
 * appeler l'API directement.
 */

export const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const
export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number]

export const DEFAULT_MAX_FILE_SIZE = 20 * 1024 * 1024

export type FileRejectionReason = 'size' | 'declared-type' | 'content-mismatch' | 'empty'

export interface FileRejection {
  reason: FileRejectionReason
  message: string
  /** Code HTTP a renvoyer : 413 pour la taille, 415 pour le type. */
  status: 413 | 415 | 400
}

export interface FileCandidate {
  filename: string
  size: number
  /** Type declare par le client, dans l'en-tete multipart. Non fiable. */
  declaredMimeType: string
  /**
   * Types deduits de la signature binaire du contenu. Vide si la signature est
   * inconnue. L'extraction se fait dans la couche appelante, ce module reste pur.
   */
  detectedMimeTypes: string[]
}

function isAccepted(mimeType: string): mimeType is AcceptedMimeType {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(mimeType)
}

/**
 * Verifie une piece. Renvoie `null` si elle est recevable.
 *
 * Le point important est le controle `content-mismatch` : un `.exe` renomme en
 * `.pdf` passe la verification d'extension et celle du type declare, tous deux
 * fournis par le client. Seule la signature binaire du contenu le trahit.
 */
export function validateFile(
  candidate: FileCandidate,
  maxFileSize: number = DEFAULT_MAX_FILE_SIZE,
): FileRejection | null {
  if (candidate.size <= 0) {
    return { reason: 'empty', message: 'Fichier vide.', status: 400 }
  }

  if (candidate.size > maxFileSize) {
    const maxMo = Math.floor(maxFileSize / (1024 * 1024))
    return {
      reason: 'size',
      message: `Fichier trop lourd. ${maxMo} Mo maximum.`,
      status: 413,
    }
  }

  if (!isAccepted(candidate.declaredMimeType)) {
    return {
      reason: 'declared-type',
      message: 'Format refuse. PDF, JPG ou PNG uniquement.',
      status: 415,
    }
  }

  // Signature illisible ou absente : on refuse plutot que de faire confiance au
  // type declare. Les trois formats acceptes ont tous une signature reconnaissable.
  if (candidate.detectedMimeTypes.length === 0) {
    return {
      reason: 'content-mismatch',
      message: 'Contenu du fichier non reconnu.',
      status: 415,
    }
  }

  if (!candidate.detectedMimeTypes.some(isAccepted)) {
    return {
      reason: 'content-mismatch',
      message: 'Le contenu du fichier ne correspond pas a son extension.',
      status: 415,
    }
  }

  return null
}

/**
 * Nettoie un nom de fichier avant stockage.
 * Le nom vient du client : il peut contenir des separateurs de chemin, des
 * caracteres de controle, ou faire plusieurs kilo-octets.
 */
export function sanitizeFilename(filename: string): string {
  const withoutPath = filename.split(/[/\\]/).pop() ?? 'piece'

  const cleaned = withoutPath
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[^\w.\- ]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned === '' || /^\.+$/.test(cleaned)) return 'piece'
  return cleaned.slice(0, 200)
}

/**
 * Cle de l'objet dans le bucket.
 * Prefixee par la demande : lister ou purger les pieces d'un dossier reste un
 * seul appel S3, et deux fichiers homonymes de demandes differentes ne collisionnent pas.
 */
export function buildObjectKey(requestId: string, fileId: string, filename: string): string {
  return `requests/${requestId}/${fileId}-${sanitizeFilename(filename)}`
}
