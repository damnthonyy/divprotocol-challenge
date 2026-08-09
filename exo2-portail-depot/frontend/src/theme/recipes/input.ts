import { defineRecipe } from '@chakra-ui/react'

/** Champ de saisie : bordure 1px, radius 8px, focus en violet. */
export const inputRecipe = defineRecipe({
  className: 'div-input',
  base: {
    width: '100%',
    bg: 'bg.surface',
    color: 'fg',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'border',
    borderRadius: 'md',
    px: '12px',
    py: '10px',
    fontSize: 'lg',
    lineHeight: '1.4',
    transitionProperty: 'border-color, box-shadow',
    transitionDuration: 'fast',
    _placeholder: { color: 'fg.subtle' },
    _hover: { borderColor: 'border.accent' },
    _focusVisible: {
      outline: 'none',
      borderColor: 'border.emphasis',
      boxShadow: 'inset 0 0 0 1px var(--chakra-colors-div-primary)',
    },
    _disabled: { bg: 'bg.accent', cursor: 'not-allowed', opacity: 0.7 },
  },

  variants: {
    invalid: {
      true: {
        borderColor: 'status.expired.fg',
        _focusVisible: {
          borderColor: 'status.expired.fg',
          boxShadow: 'inset 0 0 0 1px var(--chakra-colors-div-danger)',
        },
      },
    },
    font: {
      mono: { fontFamily: 'mono', fontSize: 'md' },
    },
  },
})
