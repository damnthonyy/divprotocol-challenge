/** Regles de depot cote client. Le backend les revalide : ceci n'est qu'un garde-fou UX. */

export const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 Mo, valeur affichee dans la zone de depot
export const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const
export const ACCEPT_ATTRIBUTE = '.pdf,.jpg,.jpeg,.png'

export type FileRejectionReason = 'type' | 'size'

export interface FileRejection {
  file: File
  reason: FileRejectionReason
  message: string
}

export function validateFile(file: File): FileRejection | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
    return { file, reason: 'type', message: 'Format refuse. PDF, JPG ou PNG uniquement.' }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { file, reason: 'size', message: 'Fichier trop lourd. 20 Mo maximum.' }
  }
  return null
}

export function partitionFiles(files: File[]): {
  accepted: File[]
  rejected: FileRejection[]
} {
  const accepted: File[] = []
  const rejected: FileRejection[] = []

  for (const file of files) {
    const rejection = validateFile(file)
    if (rejection) rejected.push(rejection)
    else accepted.push(file)
  }

  return { accepted, rejected }
}

/** "contrat-signe.pdf" -> "PDF", pour la vignette de la ligne de fichier. */
export function fileExtensionLabel(filename: string): string {
  const extension = filename.split('.').pop()
  if (!extension || extension === filename) return 'FIC'
  return extension.slice(0, 4).toUpperCase()
}
