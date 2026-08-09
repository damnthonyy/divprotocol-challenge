import { defineSlotRecipe } from '@chakra-ui/react'

/**
 * Socle commun aux trois etats non nominaux : vide, chargement, erreur.
 * Un seul recipe pour les trois garantit la meme densite d'un ecran a l'autre —
 * c'est explicitement ce qui est regarde dans le rendu.
 */
export const statePanelSlotRecipe = defineSlotRecipe({
  className: 'div-state-panel',
  slots: ['root', 'icon', 'title', 'description', 'actions'],

  base: {
    root: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      py: '24px',
      px: '16px',
    },
    icon: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '44px',
      height: '44px',
      borderRadius: 'full',
      mb: '12px',
      fontSize: '2xl',
      lineHeight: '1',
      bg: 'bg.accent',
      color: 'fg.accent',
    },
    title: {
      fontSize: 'lg',
      fontWeight: 'semibold',
      color: 'fg',
    },
    description: {
      fontSize: 'sm',
      color: 'fg.muted',
      mt: '4px',
      maxWidth: '38ch',
    },
    actions: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: '8px',
      mt: '16px',
    },
  },

  variants: {
    tone: {
      neutral: {},
      error: {
        icon: { bg: 'status.expired.bg', color: 'status.expired.fg' },
      },
      loading: {
        icon: { bg: 'bg.accent', color: 'fg.accent' },
      },
    },
  },

  defaultVariants: {
    tone: 'neutral',
  },
})
