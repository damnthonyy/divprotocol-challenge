import { describe, expect, it } from 'vitest'

import { formatFileSize, formatProgress, formatRelative, isExpired } from './format'

describe('formatFileSize', () => {
  it('utilise le separateur decimal francais', () => {
    expect(formatFileSize(2_516_582)).toBe('2,4 Mo')
  })

  it('n affiche pas de decimale pour les octets', () => {
    expect(formatFileSize(512)).toBe('512 o')
  })

  it('gere le fichier vide', () => {
    expect(formatFileSize(0)).toBe('0 o')
  })
})

describe('formatRelative', () => {
  const now = new Date('2026-03-15T12:00:00Z')

  it('exprime une echeance a venir en jours', () => {
    expect(formatRelative('2026-03-19T12:00:00Z', now)).toContain('4 jours')
  })

  it('exprime une echeance passee', () => {
    // `numeric: 'auto'` privilegie les formulations naturelles ("avant-hier")
    // quand elles existent : c'est voulu, la valeur brute serait moins lisible.
    expect(formatRelative('2026-03-13T12:00:00Z', now)).toBe('avant-hier')
    expect(formatRelative('2026-03-10T12:00:00Z', now)).toContain('5 jours')
  })

  it('bascule sur les heures en deca d un jour', () => {
    expect(formatRelative('2026-03-15T15:00:00Z', now)).toContain('heures')
  })
})

describe('isExpired', () => {
  const now = new Date('2026-03-15T12:00:00Z')

  it('considere une date passee comme expiree', () => {
    expect(isExpired('2026-03-14T12:00:00Z', now)).toBe(true)
  })

  it('considere une date future comme valide', () => {
    expect(isExpired('2026-03-16T12:00:00Z', now)).toBe(false)
  })

  it('traite l instant exact d expiration comme expire', () => {
    expect(isExpired('2026-03-15T12:00:00Z', now)).toBe(true)
  })
})

describe('formatProgress', () => {
  it('accorde le pluriel', () => {
    expect(formatProgress(1, 4)).toBe('1 piece sur 4')
    expect(formatProgress(2, 4)).toBe('2 pieces sur 4')
  })
})
