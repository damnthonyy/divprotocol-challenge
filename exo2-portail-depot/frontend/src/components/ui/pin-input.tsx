import { createSlotRecipeContext, type HTMLChakraProps } from '@chakra-ui/react'
import { useId, useRef, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from 'react'

const { withProvider, withContext } = createSlotRecipeContext({ key: 'divPinInput' })

const PinRoot = withProvider<HTMLDivElement, HTMLChakraProps<'div'>>('div', 'root')
const PinLabel = withContext<HTMLSpanElement, HTMLChakraProps<'span'>>('span', 'label')
const PinControl = withContext<HTMLDivElement, HTMLChakraProps<'div'>>('div', 'control')
const PinCell = withContext<HTMLInputElement, HTMLChakraProps<'input'>>('input', 'input')

export interface PinInputProps {
  value: string
  onChange: (value: string) => void
  /** Appele des que les N chiffres sont saisis, y compris par collage. */
  onComplete?: (value: string) => void
  length?: number
  label?: string
  invalid?: boolean
  disabled?: boolean
  autoFocus?: boolean
  'aria-describedby'?: string
}

const DIGITS_ONLY = /\D/g

/**
 * Saisie d'un code PIN chiffre par chiffre.
 * Ecrit a la main plutot que via une librairie : il faut gerer le collage des
 * quatre chiffres d'un coup (le client recoit son PIN par un autre canal et le colle),
 * le retour arriere qui recule d'une case, et les fleches — trois comportements
 * que l'on veut pouvoir tester unitairement.
 */
export function PinInput({
  value,
  onChange,
  onComplete,
  length = 4,
  label,
  invalid,
  disabled,
  autoFocus,
  'aria-describedby': describedBy,
}: PinInputProps) {
  const groupId = useId()
  const refs = useRef<Array<HTMLInputElement | null>>([])

  const digits = Array.from({ length }, (_, index) => value[index] ?? '')

  const commit = (next: string) => {
    const sanitized = next.replace(DIGITS_ONLY, '').slice(0, length)
    onChange(sanitized)
    if (sanitized.length === length) onComplete?.(sanitized)
  }

  const focusCell = (index: number) => {
    const target = refs.current[Math.min(Math.max(index, 0), length - 1)]
    target?.focus()
    target?.select()
  }

  const handleChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const typed = event.target.value.replace(DIGITS_ONLY, '')
    if (!typed) return

    // Saisie multi-caracteres (autofill SMS, collage dans une case) : on remplit a partir d'ici.
    const chars = typed.split('')
    const next = digits.slice()
    chars.forEach((char, offset) => {
      if (index + offset < length) next[index + offset] = char
    })

    commit(next.join(''))
    focusCell(index + chars.length)
  }

  const handleKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const next = digits.slice()
      if (next[index]) {
        next[index] = ''
        commit(next.join(''))
      } else if (index > 0) {
        next[index - 1] = ''
        commit(next.join(''))
        focusCell(index - 1)
      }
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusCell(index - 1)
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusCell(index + 1)
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(DIGITS_ONLY, '').slice(0, length)
    if (!pasted) return
    commit(pasted)
    focusCell(pasted.length)
  }

  return (
    <PinRoot role="group" aria-labelledby={label ? `${groupId}-label` : undefined}>
      {label ? <PinLabel id={`${groupId}-label`}>{label}</PinLabel> : null}

      <PinControl>
        {digits.map((digit, index) => (
          <PinCell
            key={index}
            ref={(node: HTMLInputElement | null) => {
              refs.current[index] = node
            }}
            value={digit}
            onChange={handleChange(index)}
            onKeyDown={handleKeyDown(index)}
            onPaste={handlePaste}
            onFocus={(event) => event.currentTarget.select()}
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={length}
            disabled={disabled}
            autoFocus={autoFocus && index === 0}
            aria-label={`Chiffre ${index + 1} sur ${length}`}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            data-invalid={invalid ? '' : undefined}
          />
        ))}
      </PinControl>
    </PinRoot>
  )
}
