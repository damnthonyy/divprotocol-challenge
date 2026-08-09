import { defineRecipe } from '@chakra-ui/react'

/**
 * La signature d'interaction de la charte DIV : au survol, le bouton primaire
 * s'inverse (fond accent, texte primary, contour inset 1px primary).
 * Metriques reprises telles quelles du site public : padding 14/24, radius full,
 * 16px/600, line-height 1, transition .2s.
 */
export const buttonRecipe = defineRecipe({
  className: 'div-button',
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    lineHeight: '1',
    borderRadius: 'full',
    cursor: 'pointer',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    transitionProperty: 'background-color, color, box-shadow, border-color',
    transitionDuration: 'fast',
    transitionTimingFunction: 'ease',
    _focusVisible: {
      outline: '2px solid',
      outlineColor: 'border.emphasis',
      outlineOffset: '2px',
    },
    _disabled: {
      opacity: 0.45,
      cursor: 'not-allowed',
      pointerEvents: 'none',
    },
  },

  variants: {
    visual: {
      primary: {
        bg: 'fg.accent',
        color: 'fg.inverted',
        fontWeight: 'semibold',
        borderWidth: '0',
        _hover: {
          bg: 'bg.accent',
          color: 'fg.accent',
          boxShadow: 'inset 0 0 0 1px var(--chakra-colors-div-primary)',
        },
      },
      secondary: {
        bg: 'bg.surface',
        color: 'fg.muted',
        fontWeight: 'normal',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'border',
        _hover: {
          bg: 'bg.accent',
          borderColor: 'border.accent',
          color: 'fg.accent',
        },
      },
      ghost: {
        bg: 'transparent',
        color: 'fg.accent',
        fontWeight: 'semibold',
        borderWidth: '0',
        _hover: {
          bg: 'bg.accent',
        },
      },
      danger: {
        bg: 'status.expired.bg',
        color: 'status.expired.fg',
        fontWeight: 'semibold',
        borderWidth: '0',
        _hover: {
          bg: 'bg.surface',
          boxShadow: 'inset 0 0 0 1px var(--chakra-colors-div-danger)',
        },
      },
    },

    size: {
      md: {
        px: '24px',
        py: '14px',
        fontSize: 'xl',
      },
      sm: {
        px: '16px',
        py: '10px',
        fontSize: 'lg',
      },
      xs: {
        px: '12px',
        py: '6px',
        fontSize: 'sm',
      },
    },

    fullWidth: {
      true: { width: '100%' },
    },
  },

  defaultVariants: {
    visual: 'primary',
    size: 'md',
  },
})
