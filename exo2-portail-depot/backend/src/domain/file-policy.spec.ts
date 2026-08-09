import {
  DEFAULT_MAX_FILE_SIZE,
  buildObjectKey,
  sanitizeFilename,
  validateFile,
  type FileCandidate,
} from './file-policy'

const pdf = (overrides: Partial<FileCandidate> = {}): FileCandidate => ({
  filename: 'contrat-signe.pdf',
  size: 2_516_582,
  declaredMimeType: 'application/pdf',
  detectedMimeTypes: ['application/pdf'],
  ...overrides,
})

describe('validateFile', () => {
  it('accepte les trois formats prevus', () => {
    expect(validateFile(pdf())).toBeNull()
    expect(
      validateFile(
        pdf({ declaredMimeType: 'image/jpeg', detectedMimeTypes: ['image/jpeg'] }),
      ),
    ).toBeNull()
    expect(
      validateFile(pdf({ declaredMimeType: 'image/png', detectedMimeTypes: ['image/png'] })),
    ).toBeNull()
  })

  describe('taille', () => {
    it('accepte un fichier exactement a la limite', () => {
      expect(validateFile(pdf({ size: DEFAULT_MAX_FILE_SIZE }))).toBeNull()
    })

    it('refuse un octet au-dela, en 413', () => {
      const rejection = validateFile(pdf({ size: DEFAULT_MAX_FILE_SIZE + 1 }))
      expect(rejection).toMatchObject({ reason: 'size', status: 413 })
      expect(rejection?.message).toContain('20 Mo')
    })

    it('refuse un fichier vide', () => {
      expect(validateFile(pdf({ size: 0 }))).toMatchObject({ reason: 'empty', status: 400 })
    })

    it('reporte la limite configuree dans le message', () => {
      const rejection = validateFile(pdf({ size: 6 * 1024 * 1024 }), 5 * 1024 * 1024)
      expect(rejection?.message).toContain('5 Mo')
    })
  })

  describe('type', () => {
    it('refuse un type declare non prevu, en 415', () => {
      const rejection = validateFile(
        pdf({ declaredMimeType: 'application/msword', detectedMimeTypes: ['application/msword'] }),
      )
      expect(rejection).toMatchObject({ reason: 'declared-type', status: 415 })
    })

    it('demasque un executable renomme en .pdf', () => {
      // Extension et type declare viennent tous deux du client : seule la
      // signature binaire trahit le contenu reel.
      const rejection = validateFile(
        pdf({
          filename: 'contrat.pdf',
          declaredMimeType: 'application/pdf',
          detectedMimeTypes: ['application/x-msdownload'],
        }),
      )
      expect(rejection).toMatchObject({ reason: 'content-mismatch', status: 415 })
    })

    it('refuse un contenu dont la signature est illisible', () => {
      const rejection = validateFile(pdf({ detectedMimeTypes: [] }))
      expect(rejection).toMatchObject({ reason: 'content-mismatch', status: 415 })
    })

    it('accepte si l un des types detectes convient', () => {
      // Certaines signatures sont ambigues et remontent plusieurs candidats.
      expect(
        validateFile(pdf({ detectedMimeTypes: ['application/zip', 'application/pdf'] })),
      ).toBeNull()
    })
  })

  it('verifie la taille avant le type : un enorme .exe repond 413, pas 415', () => {
    const rejection = validateFile(
      pdf({
        size: DEFAULT_MAX_FILE_SIZE + 1,
        declaredMimeType: 'application/x-msdownload',
        detectedMimeTypes: [],
      }),
    )
    expect(rejection?.status).toBe(413)
  })
})

describe('sanitizeFilename', () => {
  it('laisse intact un nom ordinaire', () => {
    expect(sanitizeFilename('contrat-signe.pdf')).toBe('contrat-signe.pdf')
  })

  it('retire les composants de chemin', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd')
    expect(sanitizeFilename('C:\\Users\\moi\\piece.pdf')).toBe('piece.pdf')
  })

  it('remplace les caracteres exotiques', () => {
    expect(sanitizeFilename('pièce d\u2019identité.jpg')).toBe('pi_ce d_identit_.jpg')
  })

  it('supprime les caracteres de controle', () => {
    expect(sanitizeFilename('contrat\u0000\u001f.pdf')).toBe('contrat.pdf')
  })

  it('retombe sur un nom neutre quand il ne reste rien', () => {
    expect(sanitizeFilename('...')).toBe('piece')
    expect(sanitizeFilename('')).toBe('piece')
    expect(sanitizeFilename('/')).toBe('piece')
  })

  it('tronque les noms demesures', () => {
    expect(sanitizeFilename('a'.repeat(500)).length).toBe(200)
  })
})

describe('buildObjectKey', () => {
  it('prefixe par la demande et assainit le nom', () => {
    expect(buildObjectKey('req_001', 'file_abc', '../contrat.pdf')).toBe(
      'requests/req_001/file_abc-contrat.pdf',
    )
  })

  it('evite la collision entre deux homonymes', () => {
    const first = buildObjectKey('req_001', 'file_a', 'contrat.pdf')
    const second = buildObjectKey('req_001', 'file_b', 'contrat.pdf')
    expect(first).not.toBe(second)
  })
})
