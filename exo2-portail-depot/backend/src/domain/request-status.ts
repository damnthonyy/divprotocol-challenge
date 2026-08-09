/**
 * Statut d'une demande de depot.
 *
 * Le statut n'est PAS stocke en base : il est derive a la lecture. Une colonne
 * dénormalisee mentirait des qu'un lien expire, puisque rien ni personne n'ecrit
 * en base a l'instant de l'expiration — il faudrait une tache de fond pour la
 * rafraichir, et cette tache serait un point de panne de plus.
 *
 * Ce fichier ne connait ni Prisma, ni NestJS, ni HTTP : c'est ce qui rend les
 * transitions de statut testables comme une fonction pure.
 */

export type RequestStatus = 'pending' | 'complete' | 'expired'

export interface RequestStatusInput {
  expiresAt: Date
  uploadedCount: number
  expectedFiles: number
  /** Revocation manuelle par l'avocat. Prime sur tout le reste. */
  revokedAt?: Date | null
}

export function computeStatus(input: RequestStatusInput, now: Date = new Date()): RequestStatus {
  const { expiresAt, uploadedCount, expectedFiles, revokedAt } = input

  // Une demande revoquee est traitee comme expiree cote client : meme message,
  // meme impasse. Distinguer les deux n'apporterait rien au deposant.
  if (revokedAt && revokedAt.getTime() <= now.getTime()) return 'expired'

  // L'expiration prime sur la completude : un lien echu ne redevient pas valable
  // parce que toutes les pieces etaient arrivees avant l'echeance.
  if (expiresAt.getTime() <= now.getTime()) return 'expired'

  return uploadedCount >= expectedFiles ? 'complete' : 'pending'
}

/** Un lien peut-il encore etre ouvert par le deposant ? */
export function isLinkUsable(input: RequestStatusInput, now: Date = new Date()): boolean {
  return computeStatus(input, now) !== 'expired'
}

/**
 * Une piece supplementaire peut-elle etre acceptee ?
 *
 * Volontairement plus permissif que `status === 'pending'` : une demande
 * `complete` accepte encore des pieces tant que le lien est valable. Le client
 * qui envoie un document de plus ne doit pas se heurter a un refus parce qu'il
 * a atteint un compteur indicatif — `expectedFiles` sert a afficher une
 * progression, pas a plafonner un depot.
 */
export function canAcceptUpload(input: RequestStatusInput, now: Date = new Date()): boolean {
  return isLinkUsable(input, now)
}

/** Millisecondes restantes avant expiration, jamais negatif. */
export function timeToExpiry(expiresAt: Date, now: Date = new Date()): number {
  return Math.max(0, expiresAt.getTime() - now.getTime())
}
