import { Spinner, createSlotRecipeContext, type HTMLChakraProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'

import { Button } from './button'

const { withProvider, withContext } = createSlotRecipeContext({ key: 'divStatePanel' })

const Root = withProvider<
  HTMLDivElement,
  HTMLChakraProps<'div'> & { tone?: 'neutral' | 'error' | 'loading' }
>('div', 'root')
const Icon = withContext<HTMLSpanElement, HTMLChakraProps<'span'>>('span', 'icon')
const Title = withContext<HTMLParagraphElement, HTMLChakraProps<'p'>>('p', 'title')
const Description = withContext<HTMLParagraphElement, HTMLChakraProps<'p'>>('p', 'description')
const Actions = withContext<HTMLDivElement, HTMLChakraProps<'div'>>('div', 'actions')

interface BasePanelProps {
  title: string
  description?: string
  icon?: ReactNode
  actions?: ReactNode
}

/** Etat vide : ne jamais laisser un ecran blanc sans explication ni action. */
export function EmptyState({ title, description, icon = '+', actions }: BasePanelProps) {
  return (
    <Root tone="neutral">
      <Icon aria-hidden="true">{icon}</Icon>
      <Title>{title}</Title>
      {description ? <Description>{description}</Description> : null}
      {actions ? <Actions>{actions}</Actions> : null}
    </Root>
  )
}

export interface ErrorStateProps extends BasePanelProps {
  onRetry?: () => void
  retryLabel?: string
}

/** Etat d'erreur : toujours accompagne d'une action, jamais d'un message seul. */
export function ErrorState({
  title = 'Quelque chose a echoue',
  description,
  icon = '!',
  onRetry,
  retryLabel = 'Reessayer',
  actions,
}: ErrorStateProps) {
  return (
    <Root tone="error" role="alert">
      <Icon aria-hidden="true">{icon}</Icon>
      <Title>{title}</Title>
      {description ? <Description>{description}</Description> : null}
      {actions ?? (onRetry ? (
        <Actions>
          <Button visual="secondary" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </Actions>
      ) : null)}
    </Root>
  )
}

export interface LoadingStateProps {
  title?: string
  description?: string
}

export function LoadingState({
  title = 'Chargement',
  description = 'Un instant, les donnees arrivent.',
}: LoadingStateProps) {
  return (
    <Root tone="loading" aria-busy="true" aria-live="polite">
      <Icon aria-hidden="true">
        <Spinner size="sm" borderWidth="2px" color="fg.accent" />
      </Icon>
      <Title>{title}</Title>
      {description ? <Description>{description}</Description> : null}
    </Root>
  )
}
