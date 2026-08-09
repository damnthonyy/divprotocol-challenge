import {
  Box,
  createRecipeContext,
  type HTMLChakraProps,
  type RecipeVariantProps,
} from '@chakra-ui/react'

import type { badgeRecipe } from '@/theme/recipes/badge'
import type { RequestStatus } from '@/api/schemas'

const { withContext } = createRecipeContext({ key: 'divBadge' })

type BadgeVariantProps = RecipeVariantProps<typeof badgeRecipe>

export type BadgeProps = HTMLChakraProps<'span', BadgeVariantProps>

/** Pastille generique. Pour un statut de demande, preferer `StatusBadge`. */
export const Badge = withContext<HTMLSpanElement, BadgeProps>('span')

/**
 * Libelles francais des statuts, definis une seule fois.
 * Le mapping statut -> couleur vit dans les semantic tokens, pas ici.
 */
const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'En attente',
  complete: 'Complete',
  expired: 'Expiree',
}

const STATUS_DOT: Record<RequestStatus, string> = {
  pending: 'status.pending.fg',
  complete: 'status.complete.fg',
  expired: 'status.expired.fg',
}

export interface StatusBadgeProps extends Omit<BadgeProps, 'tone' | 'children'> {
  status: RequestStatus
  /** Ajoute une pastille de couleur : le statut reste lisible sans dependre de la seule couleur. */
  withDot?: boolean
}

export function StatusBadge({ status, withDot = true, ...rest }: StatusBadgeProps) {
  return (
    <Badge tone={status} {...rest}>
      {withDot ? (
        <Box
          as="span"
          aria-hidden="true"
          width="6px"
          height="6px"
          borderRadius="full"
          bg={STATUS_DOT[status]}
        />
      ) : null}
      {STATUS_LABEL[status]}
    </Badge>
  )
}

export { STATUS_LABEL }
