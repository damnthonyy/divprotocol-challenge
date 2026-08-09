import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen } from '@/test/render'

import { Button } from './button'

describe('Button', () => {
  it('rend le libelle et reagit au clic', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    renderWithProviders(<Button onClick={onClick}>Creer une demande</Button>)

    await user.click(screen.getByRole('button', { name: 'Creer une demande' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("rattache l'element a la recipe qui porte l'inversion au hover", () => {
    renderWithProviders(<Button>Deposer</Button>)
    // La regle :hover vit dans la feuille generee par la recipe ; le test
    // verrouille le fait que le bouton y est bien rattache.
    expect(screen.getByRole('button')).toHaveClass('div-button')
  })

  it('neutralise le clic pendant le chargement', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    renderWithProviders(
      <Button loading loadingText="Creation" onClick={onClick}>
        Creer
      </Button>,
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveTextContent('Creation')

    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})
