import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen } from '@/test/render'

import { CopyField } from './copy-field'

describe('CopyField', () => {
  it("rend la valeur et l'indication sous le champ", () => {
    // Le hint vit dans le meme contexte de slots que le reste du composant :
    // le sortir du provider casse le rendu a l'execution sans que TS le voie.
    renderWithProviders(
      <CopyField
        value="https://depot.divprotocol.com/d/8f3a2c1b"
        display="depot.divprotocol.com/d/8f3a2c1b"
        hint="Expire le 19 mars."
      />,
    )

    expect(screen.getByText('depot.divprotocol.com/d/8f3a2c1b')).toBeInTheDocument()
    expect(screen.getByText('Expire le 19 mars.')).toBeInTheDocument()
  })

  it('copie la valeur complete, pas le texte tronque', async () => {
    // userEvent installe un presse-papiers en lecture seule sur `navigator` :
    // on l'espionne plutot que de le remplacer.
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')

    renderWithProviders(
      <CopyField
        value="https://depot.divprotocol.com/d/8f3a2c1b"
        display="depot.divprotocol.com/d/8f3a2c1b"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Copier le lien' }))

    expect(writeText).toHaveBeenCalledWith('https://depot.divprotocol.com/d/8f3a2c1b')
    expect(await screen.findByText('Copie')).toBeInTheDocument()
  })
})
