import {
  Spinner,
  createRecipeContext,
  type HTMLChakraProps,
  type RecipeVariantProps,
} from '@chakra-ui/react'
import { forwardRef } from 'react'

import type { buttonRecipe } from '@/theme/recipes/button'

const { withContext } = createRecipeContext({ key: 'divButton' })

type ButtonVariantProps = RecipeVariantProps<typeof buttonRecipe>

export interface ButtonProps extends HTMLChakraProps<'button', ButtonVariantProps> {
  /** Affiche un spinner et neutralise le clic. Le libelle reste visible pour eviter le saut de layout. */
  loading?: boolean
  loadingText?: string
}

const StyledButton = withContext<HTMLButtonElement, ButtonProps>('button')

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { loading, loadingText, disabled, children, ...rest },
  ref,
) {
  return (
    <StyledButton ref={ref} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {loading ? <Spinner size="inherit" borderWidth="2px" /> : null}
      {loading && loadingText ? loadingText : children}
    </StyledButton>
  )
})
