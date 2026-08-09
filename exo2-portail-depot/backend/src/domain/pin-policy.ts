/**
 * Politique de protection du code PIN.
 *
 * Un PIN a 4 chiffres, c'est 10 000 combinaisons : sans limitation, il tombe en
 * quelques minutes. Deux mecanismes se completent et repondent a des menaces
 * differentes :
 *
 *  - le verrouillage compte les echecs **en base**, par lien. Il survit a un
 *    redemarrage de l'application et suit le lien, pas le client ;
 *  - la limitation de debit HTTP (@nestjs/throttler) plafonne la cadence par IP.
 *    Elle ne suffit pas seule : un attaquant qui change d'IP la contourne.
 *
 * Fichier pur : ni base, ni HTTP, ni horloge implicite.
 */

export interface PinAttemptState {
  failedAttempts: number
  /** Date de fin de verrouillage, ou null si le lien n'est pas verrouille. */
  lockedUntil: Date | null
}

export interface PinPolicyOptions {
  maxAttempts: number
  lockoutMinutes: number
}

export const DEFAULT_PIN_POLICY: PinPolicyOptions = {
  maxAttempts: 5,
  lockoutMinutes: 15,
}

export type PinCheckOutcome =
  | { outcome: 'locked'; retryAfterSeconds: number }
  | { outcome: 'accepted'; next: PinAttemptState }
  | { outcome: 'rejected'; next: PinAttemptState; attemptsLeft: number }

export function isLocked(state: PinAttemptState, now: Date = new Date()): boolean {
  return state.lockedUntil !== null && state.lockedUntil.getTime() > now.getTime()
}

/**
 * Applique une tentative a l'etat courant et renvoie l'etat suivant.
 *
 * La verification du PIN elle-meme (comparaison au hachage argon2) se fait en
 * amont : cette fonction ne voit qu'un booleen, elle ne manipule aucun secret.
 */
export function registerAttempt(
  state: PinAttemptState,
  isCorrect: boolean,
  options: PinPolicyOptions = DEFAULT_PIN_POLICY,
  now: Date = new Date(),
): PinCheckOutcome {
  if (isLocked(state, now)) {
    const remainingMs = state.lockedUntil!.getTime() - now.getTime()
    return { outcome: 'locked', retryAfterSeconds: Math.ceil(remainingMs / 1000) }
  }

  if (isCorrect) {
    // Un succes remet le compteur a zero : les echecs precedents etaient
    // probablement des fautes de frappe, pas une attaque.
    return { outcome: 'accepted', next: { failedAttempts: 0, lockedUntil: null } }
  }

  const failedAttempts = state.failedAttempts + 1
  const reachedLimit = failedAttempts >= options.maxAttempts

  const next: PinAttemptState = {
    failedAttempts,
    lockedUntil: reachedLimit
      ? new Date(now.getTime() + options.lockoutMinutes * 60_000)
      : state.lockedUntil,
  }

  return {
    outcome: 'rejected',
    next,
    attemptsLeft: Math.max(0, options.maxAttempts - failedAttempts),
  }
}

/**
 * Etat repris apres l'expiration d'un verrouillage.
 * Le compteur repart de zero : sans cela, le lien serait verrouille a vie des la
 * premiere erreur suivante, ce qui punit le client legitime plus que l'attaquant.
 */
export function releaseIfExpired(state: PinAttemptState, now: Date = new Date()): PinAttemptState {
  if (state.lockedUntil !== null && state.lockedUntil.getTime() <= now.getTime()) {
    return { failedAttempts: 0, lockedUntil: null }
  }
  return state
}

/** Message affiche au client. Le frontend l'affiche tel quel. */
export function rejectionMessage(attemptsLeft: number): string {
  if (attemptsLeft <= 0) return 'Code incorrect. Le lien est verrouille.'
  const plural = attemptsLeft > 1 ? 's' : ''
  return `Code incorrect. ${attemptsLeft} tentative${plural} restante${plural}.`
}

const PIN_PATTERN = /^\d{4}$/

export function isWellFormedPin(pin: string): boolean {
  return PIN_PATTERN.test(pin)
}

/**
 * Genere un PIN a 4 chiffres.
 * `randomInt` du module crypto, pas `Math.random` : le PIN est un secret
 * d'authentification, il ne doit pas etre predictible a partir d'un autre.
 */
export function generatePin(randomInt: (min: number, max: number) => number): string {
  return String(randomInt(0, 10_000)).padStart(4, '0')
}
