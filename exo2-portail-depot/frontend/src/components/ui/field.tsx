import {
  createRecipeContext,
  createSlotRecipeContext,
  type HTMLChakraProps,
  type RecipeVariantProps,
} from '@chakra-ui/react'
import { forwardRef, useId } from 'react'

import type { inputRecipe } from '@/theme/recipes/input'

const { withProvider, withContext } = createSlotRecipeContext({ key: 'divField' })

export const FieldRoot = withProvider<HTMLDivElement, HTMLChakraProps<'div'>>('div', 'root')
export const FieldLabel = withContext<HTMLLabelElement, HTMLChakraProps<'label'>>('label', 'label')
export const FieldHelperText = withContext<HTMLParagraphElement, HTMLChakraProps<'p'>>(
  'p',
  'helperText',
)
export const FieldErrorText = withContext<HTMLParagraphElement, HTMLChakraProps<'p'>>(
  'p',
  'errorText',
)

const { withContext: withInputContext } = createRecipeContext({ key: 'divInput' })

type InputVariantProps = RecipeVariantProps<typeof inputRecipe>

export type InputProps = HTMLChakraProps<'input', InputVariantProps>
export const Input = withInputContext<HTMLInputElement, InputProps>('input')

export type TextareaProps = HTMLChakraProps<'textarea', InputVariantProps>
export const Textarea = withInputContext<HTMLTextAreaElement, TextareaProps>('textarea')

export interface FieldProps extends Omit<HTMLChakraProps<'div'>, 'children'> {
  label: string
  helperText?: string
  /** Message d'erreur. Sa presence suffit a passer le champ en etat invalide. */
  error?: string
  required?: boolean
  children: (inputProps: {
    id: string
    'aria-describedby': string | undefined
    'aria-invalid': boolean | undefined
  }) => React.ReactNode
}

/**
 * Champ complet : libelle, controle, aide ou erreur.
 * Le rendu du controle est delegue via render prop pour que le meme habillage
 * serve a un input, un textarea ou un select sans dupliquer l'accessibilite.
 */
export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  { label, helperText, error, required, children, ...rest },
  ref,
) {
  const id = useId()
  const helperId = helperText ? `${id}-helper` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <FieldRoot ref={ref} {...rest}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true">*</span> : null}
      </FieldLabel>

      {children({
        id,
        'aria-describedby': errorId ?? helperId,
        'aria-invalid': error ? true : undefined,
      })}

      {error ? (
        <FieldErrorText id={errorId} role="alert">
          {error}
        </FieldErrorText>
      ) : helperText ? (
        <FieldHelperText id={helperId}>{helperText}</FieldHelperText>
      ) : null}
    </FieldRoot>
  )
})
