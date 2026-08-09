import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen } from '@/test/render'

import { PinInput } from './pin-input'

function Harness({ onComplete }: { onComplete?: (value: string) => void }) {
  const [value, setValue] = useState('')
  return <PinInput label="Code PIN" value={value} onChange={setValue} onComplete={onComplete} />
}

const cells = () => screen.getAllByRole('textbox') as HTMLInputElement[]

describe('PinInput', () => {
  it('avance de case en case et signale la saisie complete', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    renderWithProviders(<Harness onComplete={onComplete} />)

    await user.click(cells()[0])
    await user.keyboard('4816')

    expect(cells().map((cell) => cell.value)).toEqual(['4', '8', '1', '6'])
    expect(onComplete).toHaveBeenCalledWith('4816')
  })

  it('ignore les caracteres non numeriques', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)

    await user.click(cells()[0])
    await user.keyboard('4a8')

    expect(cells().map((cell) => cell.value)).toEqual(['4', '8', '', ''])
  })

  it('remplit les quatre cases quand le code est colle', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    renderWithProviders(<Harness onComplete={onComplete} />)

    await user.click(cells()[0])
    await user.paste('2093')

    expect(cells().map((cell) => cell.value)).toEqual(['2', '0', '9', '3'])
    expect(onComplete).toHaveBeenCalledWith('2093')
  })

  it('recule d une case quand on efface une case deja vide', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)

    await user.click(cells()[0])
    await user.keyboard('48')
    // Le curseur est sur la 3e case, vide : le premier retour arriere doit
    // effacer le "8" de la case precedente, pas rester bloque.
    await user.keyboard('{Backspace}')

    expect(cells().map((cell) => cell.value)).toEqual(['4', '', '', ''])
  })
})
