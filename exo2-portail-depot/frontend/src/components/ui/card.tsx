import { createSlotRecipeContext, type HTMLChakraProps } from '@chakra-ui/react'

const { withProvider, withContext } = createSlotRecipeContext({ key: 'divCard' })

export interface CardRootProps extends HTMLChakraProps<'div'> {
  density?: 'compact' | 'comfortable'
  interactive?: boolean
}

export const Card = {
  Root: withProvider<HTMLDivElement, CardRootProps>('div', 'root'),
  Header: withContext<HTMLDivElement, HTMLChakraProps<'div'>>('div', 'header'),
  Title: withContext<HTMLParagraphElement, HTMLChakraProps<'p'>>('p', 'title'),
  Meta: withContext<HTMLParagraphElement, HTMLChakraProps<'p'>>('p', 'meta'),
  Body: withContext<HTMLDivElement, HTMLChakraProps<'div'>>('div', 'body'),
  Footer: withContext<HTMLDivElement, HTMLChakraProps<'div'>>('div', 'footer'),
}
