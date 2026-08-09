import { describe, expect, it } from 'vitest'

import { renderWithProviders, screen } from '@/test/render'

import { KitPage } from './kit-page'

/**
 * Smoke test du design system : /kit monte tous les composants du kit d'un coup.
 * Il attrape les erreurs de contexte de slots (un sous-composant rendu hors de son
 * `Root`), qui compilent sans probleme mais cassent a l'execution.
 */
describe('KitPage', () => {
  it('monte tous les composants du kit sans erreur', () => {
    renderWithProviders(<KitPage />)

    expect(screen.getByText('Boutons')).toBeInTheDocument()
    expect(screen.getByText('Statuts de demande')).toBeInTheDocument()
    expect(screen.getByText('Champ de saisie')).toBeInTheDocument()
    expect(screen.getByText('Zone de depot')).toBeInTheDocument()
    expect(screen.getByText('Fichier depose')).toBeInTheDocument()
    expect(screen.getByText('Carte de demande')).toBeInTheDocument()
    expect(screen.getByText('Lien genere')).toBeInTheDocument()
    expect(screen.getByText('Etat vide')).toBeInTheDocument()
  })

  it('rend les trois etats non nominaux', () => {
    renderWithProviders(<KitPage />)

    expect(screen.getByText('Aucune demande en cours')).toBeInTheDocument()
    expect(screen.getByText('Chargement')).toBeInTheDocument()
    expect(screen.getByText('Impossible de charger les demandes')).toBeInTheDocument()
  })
})
