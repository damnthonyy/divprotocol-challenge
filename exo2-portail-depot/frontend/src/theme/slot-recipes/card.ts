import { defineSlotRecipe } from '@chakra-ui/react'

/**
 * Card DIV : fond blanc, bordure 1px, radius 12px, AUCUNE ombre.
 * Le `footer` est separe par un filet, pas par un fond gris.
 */
export const cardSlotRecipe = defineSlotRecipe({
  className: 'div-card',
  slots: ['root', 'header', 'title', 'meta', 'body', 'footer'],

  base: {
    root: {
      display: 'flex',
      flexDirection: 'column',
      bg: 'bg.surface',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border',
      borderRadius: 'lg',
      boxShadow: 'none',
    },
    header: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '12px',
    },
    title: {
      fontSize: 'lg',
      fontWeight: 'semibold',
      color: 'fg',
    },
    meta: {
      fontSize: 'sm',
      color: 'fg.muted',
      mt: '2px',
    },
    body: {
      color: 'fg.muted',
      fontSize: 'lg',
    },
    footer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      mt: '12px',
      pt: '12px',
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: 'border',
    },
  },

  variants: {
    density: {
      // 16px : cartes de liste (dashboard).
      compact: {
        root: { p: '16px' },
      },
      // 24px : cartes de contenu principal, valeur .card du site public.
      comfortable: {
        root: { p: '24px' },
      },
    },

    interactive: {
      true: {
        root: {
          cursor: 'pointer',
          transitionProperty: 'border-color, background-color',
          transitionDuration: 'fast',
          _hover: { borderColor: 'border.accent', bg: 'bg.accent' },
          _focusVisible: {
            outline: '2px solid',
            outlineColor: 'border.emphasis',
            outlineOffset: '2px',
          },
        },
      },
    },
  },

  defaultVariants: {
    density: 'compact',
  },
})
