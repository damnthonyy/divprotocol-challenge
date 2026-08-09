import { defineRecipe } from '@chakra-ui/react'

/**
 * Pastille de statut : couleur semantique sur son fond dedie, jamais de couleur crue.
 * `tone` correspond 1:1 aux statuts metier d'une demande de depot.
 */
export const badgeRecipe = defineRecipe({
  className: 'div-badge',
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    borderRadius: 'full',
    fontWeight: 'semibold',
    lineHeight: '1',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },

  variants: {
    tone: {
      pending: { bg: 'status.pending.bg', color: 'status.pending.fg' },
      complete: { bg: 'status.complete.bg', color: 'status.complete.fg' },
      expired: { bg: 'status.expired.bg', color: 'status.expired.fg' },
      info: { bg: 'status.info.bg', color: 'status.info.fg' },
      neutral: { bg: 'status.neutral.bg', color: 'status.neutral.fg' },
    },

    size: {
      md: { px: '12px', py: '6px', fontSize: 'sm' },
      sm: { px: '10px', py: '4px', fontSize: 'xs' },
    },
  },

  defaultVariants: {
    tone: 'neutral',
    size: 'md',
  },
})
