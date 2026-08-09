import { describe, expect, it } from 'vitest'

import type { RequestStatus } from '@/api/schemas'
import { renderWithProviders, screen } from '@/test/render'

import { StatusBadge } from './status-badge'

describe('StatusBadge', () => {
  it.each<[RequestStatus, string]>([
    ['pending', 'En attente'],
    ['complete', 'Complete'],
    ['expired', 'Expiree'],
  ])('affiche le libelle francais du statut %s', (status, label) => {
    renderWithProviders(<StatusBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('applique un habillage distinct par statut', () => {
    // jsdom ne resout pas les variables CSS : on compare les classes generees
    // par la recipe plutot qu'une couleur calculee, qui vaudrait toujours noir.
    const { unmount } = renderWithProviders(<StatusBadge status="pending" />)
    const pending = screen.getByText('En attente').closest('span')!.className
    unmount()

    renderWithProviders(<StatusBadge status="expired" />)
    const expired = screen.getByText('Expiree').closest('span')!.className

    expect(pending).toContain('div-badge')
    expect(expired).toContain('div-badge')
    expect(pending).not.toBe(expired)
  })
})
