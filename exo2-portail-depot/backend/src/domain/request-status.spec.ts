import {
  canAcceptUpload,
  computeStatus,
  isLinkUsable,
  timeToExpiry,
  type RequestStatusInput,
} from './request-status'

const NOW = new Date('2026-03-15T12:00:00.000Z')

const base = (overrides: Partial<RequestStatusInput> = {}): RequestStatusInput => ({
  expiresAt: new Date('2026-03-19T12:00:00.000Z'),
  uploadedCount: 0,
  expectedFiles: 4,
  revokedAt: null,
  ...overrides,
})

describe('computeStatus', () => {
  describe('transitions nominales', () => {
    it('est pending tant que toutes les pieces ne sont pas arrivees', () => {
      expect(computeStatus(base({ uploadedCount: 0 }), NOW)).toBe('pending')
      expect(computeStatus(base({ uploadedCount: 3 }), NOW)).toBe('pending')
    })

    it('passe a complete quand le compte attendu est atteint', () => {
      expect(computeStatus(base({ uploadedCount: 4 }), NOW)).toBe('complete')
    })

    it('reste complete si le client depose plus que demande', () => {
      expect(computeStatus(base({ uploadedCount: 7 }), NOW)).toBe('complete')
    })
  })

  describe('expiration', () => {
    it('passe a expired une fois l echeance depassee', () => {
      const expired = base({ expiresAt: new Date('2026-03-14T12:00:00.000Z') })
      expect(computeStatus(expired, NOW)).toBe('expired')
    })

    it('traite l instant exact de l echeance comme expire', () => {
      const exact = base({ expiresAt: new Date(NOW) })
      expect(computeStatus(exact, NOW)).toBe('expired')
    })

    it('reste pending une milliseconde avant l echeance', () => {
      const almost = base({ expiresAt: new Date(NOW.getTime() + 1) })
      expect(computeStatus(almost, NOW)).toBe('pending')
    })

    it('prime sur la completude : un lien echu ne redevient pas complete', () => {
      const expiredButFull = base({
        expiresAt: new Date('2026-03-14T12:00:00.000Z'),
        uploadedCount: 4,
      })
      expect(computeStatus(expiredButFull, NOW)).toBe('expired')
    })
  })

  describe('revocation', () => {
    it('prime sur tout le reste', () => {
      const revoked = base({
        uploadedCount: 4,
        revokedAt: new Date('2026-03-14T12:00:00.000Z'),
      })
      expect(computeStatus(revoked, NOW)).toBe('expired')
    })

    it('ignore une revocation datee dans le futur', () => {
      const future = base({ revokedAt: new Date('2026-03-18T12:00:00.000Z') })
      expect(computeStatus(future, NOW)).toBe('pending')
    })
  })
})

describe('isLinkUsable', () => {
  it('accepte un lien valable, quel que soit son avancement', () => {
    expect(isLinkUsable(base({ uploadedCount: 0 }), NOW)).toBe(true)
    expect(isLinkUsable(base({ uploadedCount: 4 }), NOW)).toBe(true)
  })

  it('refuse un lien echu ou revoque', () => {
    expect(isLinkUsable(base({ expiresAt: new Date('2026-03-01T00:00:00.000Z') }), NOW)).toBe(false)
    expect(isLinkUsable(base({ revokedAt: new Date('2026-03-01T00:00:00.000Z') }), NOW)).toBe(false)
  })
})

describe('canAcceptUpload', () => {
  it('accepte encore des pieces sur une demande complete mais valable', () => {
    // `expectedFiles` affiche une progression, il ne plafonne pas le depot :
    // refuser une piece de plus au client serait un faux positif.
    expect(canAcceptUpload(base({ uploadedCount: 10 }), NOW)).toBe(true)
  })

  it('refuse tout depot sur un lien echu', () => {
    const expired = base({ expiresAt: new Date('2026-03-14T12:00:00.000Z') })
    expect(canAcceptUpload(expired, NOW)).toBe(false)
  })
})

describe('timeToExpiry', () => {
  it('renvoie le delai restant', () => {
    expect(timeToExpiry(new Date('2026-03-15T13:00:00.000Z'), NOW)).toBe(3_600_000)
  })

  it('ne renvoie jamais de valeur negative', () => {
    expect(timeToExpiry(new Date('2026-03-01T00:00:00.000Z'), NOW)).toBe(0)
  })
})
