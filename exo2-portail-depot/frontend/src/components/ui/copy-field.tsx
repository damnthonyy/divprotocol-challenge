import { Box, createSlotRecipeContext, type HTMLChakraProps } from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'

const { withProvider, withContext } = createSlotRecipeContext({ key: 'divCopyField' })

const Root = withProvider<HTMLDivElement, HTMLChakraProps<'div'>>('div', 'root')
const FieldBox = withContext<HTMLDivElement, HTMLChakraProps<'div'>>('div', 'field')
const Value = withContext<HTMLElement, HTMLChakraProps<'code'>>('code', 'value')
const Action = withContext<HTMLButtonElement, HTMLChakraProps<'button'>>('button', 'action')
const Hint = withContext<HTMLParagraphElement, HTMLChakraProps<'p'>>('p', 'hint')

export interface CopyFieldProps {
  value: string
  /** Texte affiche, si different de la valeur copiee (ex. URL tronquee). */
  display?: string
  hint?: string
  label?: string
}

/**
 * Lien genere avec action de copie.
 * `navigator.clipboard` n'existe pas hors contexte securise : on retombe alors
 * sur une selection du texte, pour ne jamais laisser l'utilisateur sans recours.
 */
export function CopyField({ value, display, hint, label = 'Copier le lien' }: CopyFieldProps) {
  const [copied, setCopied] = useState(false)
  const valueRef = useRef<HTMLElement>(null)
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timeout.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      const node = valueRef.current
      if (node) {
        const range = document.createRange()
        range.selectNodeContents(node)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
    }
    setCopied(true)
    clearTimeout(timeout.current)
    timeout.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Root>
      <FieldBox>
        <Value ref={valueRef} title={value}>
          {display ?? value}
        </Value>
        <Action type="button" onClick={copy} aria-label={label}>
          {copied ? 'Copie' : 'Copier'}
        </Action>
      </FieldBox>

      {/* Annonce le succes aux lecteurs d'ecran, que le bouton soit focus ou non. */}
      <Box srOnly aria-live="polite">
        {copied ? 'Lien copie dans le presse-papiers.' : ''}
      </Box>

      {hint ? <Hint>{hint}</Hint> : null}
    </Root>
  )
}
