import {
  DEFAULT_PIN_POLICY,
  generatePin,
  isLocked,
  isWellFormedPin,
  registerAttempt,
  rejectionMessage,
  releaseIfExpired,
  type PinAttemptState,
} from './pin-policy'

const NOW = new Date('2026-03-15T12:00:00.000Z')
const fresh: PinAttemptState = { failedAttempts: 0, lockedUntil: null }

describe('registerAttempt', () => {
  it('accepte un bon code et remet le compteur a zero', () => {
    const state: PinAttemptState = { failedAttempts: 3, lockedUntil: null }
    const result = registerAttempt(state, true, DEFAULT_PIN_POLICY, NOW)

    expect(result.outcome).toBe('accepted')
    if (result.outcome !== 'accepted') throw new Error('attendu accepted')
    expect(result.next).toEqual({ failedAttempts: 0, lockedUntil: null })
  })

  it('decremente les tentatives restantes a chaque echec', () => {
    let state = fresh
    const left: number[] = []

    for (let i = 0; i < 4; i += 1) {
      const result = registerAttempt(state, false, DEFAULT_PIN_POLICY, NOW)
      if (result.outcome !== 'rejected') throw new Error('attendu rejected')
      left.push(result.attemptsLeft)
      state = result.next
    }

    expect(left).toEqual([4, 3, 2, 1])
    expect(state.lockedUntil).toBeNull()
  })

  it('verrouille au dernier echec autorise', () => {
    let state = fresh
    let last = registerAttempt(state, false, DEFAULT_PIN_POLICY, NOW)

    for (let i = 1; i < DEFAULT_PIN_POLICY.maxAttempts; i += 1) {
      if (last.outcome !== 'rejected') throw new Error('attendu rejected')
      state = last.next
      last = registerAttempt(state, false, DEFAULT_PIN_POLICY, NOW)
    }

    if (last.outcome !== 'rejected') throw new Error('attendu rejected')
    expect(last.attemptsLeft).toBe(0)
    expect(last.next.lockedUntil).toEqual(new Date('2026-03-15T12:15:00.000Z'))
  })

  it('refuse toute tentative pendant le verrouillage, meme avec le bon code', () => {
    const locked: PinAttemptState = {
      failedAttempts: 5,
      lockedUntil: new Date('2026-03-15T12:10:00.000Z'),
    }

    const result = registerAttempt(locked, true, DEFAULT_PIN_POLICY, NOW)

    expect(result.outcome).toBe('locked')
    if (result.outcome !== 'locked') throw new Error('attendu locked')
    expect(result.retryAfterSeconds).toBe(600)
  })

  it('accepte de nouveau une fois le verrouillage echu', () => {
    const expiredLock: PinAttemptState = {
      failedAttempts: 5,
      lockedUntil: new Date('2026-03-15T11:59:00.000Z'),
    }

    const result = registerAttempt(expiredLock, true, DEFAULT_PIN_POLICY, NOW)
    expect(result.outcome).toBe('accepted')
  })

  it('respecte une politique personnalisee', () => {
    const strict = { maxAttempts: 2, lockoutMinutes: 60 }
    const first = registerAttempt(fresh, false, strict, NOW)
    if (first.outcome !== 'rejected') throw new Error('attendu rejected')
    expect(first.attemptsLeft).toBe(1)

    const second = registerAttempt(first.next, false, strict, NOW)
    if (second.outcome !== 'rejected') throw new Error('attendu rejected')
    expect(second.next.lockedUntil).toEqual(new Date('2026-03-15T13:00:00.000Z'))
  })
})

describe('isLocked', () => {
  it('ne considere pas verrouille un lien dont le delai vient d expirer', () => {
    expect(isLocked({ failedAttempts: 5, lockedUntil: new Date(NOW) }, NOW)).toBe(false)
  })

  it('considere verrouille tant que le delai court', () => {
    expect(
      isLocked({ failedAttempts: 5, lockedUntil: new Date(NOW.getTime() + 1) }, NOW),
    ).toBe(true)
  })
})

describe('releaseIfExpired', () => {
  it('repart de zero apres un verrouillage echu', () => {
    const state: PinAttemptState = {
      failedAttempts: 5,
      lockedUntil: new Date('2026-03-15T11:00:00.000Z'),
    }
    expect(releaseIfExpired(state, NOW)).toEqual({ failedAttempts: 0, lockedUntil: null })
  })

  it('laisse intact un verrouillage en cours', () => {
    const state: PinAttemptState = {
      failedAttempts: 5,
      lockedUntil: new Date('2026-03-15T12:10:00.000Z'),
    }
    expect(releaseIfExpired(state, NOW)).toBe(state)
  })
})

describe('rejectionMessage', () => {
  it('accorde le pluriel', () => {
    expect(rejectionMessage(3)).toBe('Code incorrect. 3 tentatives restantes.')
    expect(rejectionMessage(1)).toBe('Code incorrect. 1 tentative restante.')
    expect(rejectionMessage(0)).toBe('Code incorrect. Le lien est verrouille.')
  })
})

describe('isWellFormedPin', () => {
  it('n accepte que quatre chiffres', () => {
    expect(isWellFormedPin('4816')).toBe(true)
    expect(isWellFormedPin('0000')).toBe(true)
    expect(isWellFormedPin('481')).toBe(false)
    expect(isWellFormedPin('48166')).toBe(false)
    expect(isWellFormedPin('48a6')).toBe(false)
    expect(isWellFormedPin(' 4816')).toBe(false)
  })
})

describe('generatePin', () => {
  it('complete les valeurs basses a quatre chiffres', () => {
    expect(generatePin(() => 7)).toBe('0007')
    expect(generatePin(() => 0)).toBe('0000')
    expect(generatePin(() => 9999)).toBe('9999')
  })

  it('produit toujours un PIN bien forme sur toute la plage', () => {
    for (const value of [0, 1, 42, 999, 1000, 9999]) {
      expect(isWellFormedPin(generatePin(() => value))).toBe(true)
    }
  })
})
