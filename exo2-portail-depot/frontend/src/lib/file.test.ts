import { describe, expect, it } from 'vitest'

import { MAX_FILE_SIZE, fileExtensionLabel, partitionFiles, validateFile } from './file'

function makeFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('validateFile', () => {
  it('accepte les formats prevus', () => {
    expect(validateFile(makeFile('contrat.pdf', 'application/pdf', 1024))).toBeNull()
    expect(validateFile(makeFile('piece.jpg', 'image/jpeg', 1024))).toBeNull()
    expect(validateFile(makeFile('scan.png', 'image/png', 1024))).toBeNull()
  })

  it('refuse un format non prevu', () => {
    const rejection = validateFile(makeFile('note.docx', 'application/msword', 1024))
    expect(rejection?.reason).toBe('type')
  })

  it('refuse un fichier au-dela de la limite', () => {
    const rejection = validateFile(makeFile('gros.pdf', 'application/pdf', MAX_FILE_SIZE + 1))
    expect(rejection?.reason).toBe('size')
  })

  it('accepte un fichier exactement a la limite', () => {
    expect(validateFile(makeFile('limite.pdf', 'application/pdf', MAX_FILE_SIZE))).toBeNull()
  })
})

describe('partitionFiles', () => {
  it('separe les fichiers valides des refuses sans en perdre', () => {
    const { accepted, rejected } = partitionFiles([
      makeFile('ok.pdf', 'application/pdf', 1024),
      makeFile('ko.docx', 'application/msword', 1024),
      makeFile('lourd.png', 'image/png', MAX_FILE_SIZE + 1),
    ])

    expect(accepted.map((file) => file.name)).toEqual(['ok.pdf'])
    expect(rejected.map((item) => item.reason)).toEqual(['type', 'size'])
  })
})

describe('fileExtensionLabel', () => {
  it('extrait une etiquette courte en majuscules', () => {
    expect(fileExtensionLabel('contrat-signe.pdf')).toBe('PDF')
    expect(fileExtensionLabel('piece-identite.jpeg')).toBe('JPEG')
  })

  it('retombe sur une etiquette neutre sans extension', () => {
    expect(fileExtensionLabel('sans-extension')).toBe('FIC')
  })
})
