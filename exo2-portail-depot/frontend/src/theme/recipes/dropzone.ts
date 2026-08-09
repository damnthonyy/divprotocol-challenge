import { defineRecipe } from '@chakra-ui/react'

/**
 * Zone de depot : bordure pointillee 2px accent doux, fond accent.
 * L'etat `dragging` renforce le contour en primary — c'est le seul retour visuel
 * dont l'utilisateur dispose pendant un glisser-deposer.
 */
export const dropzoneRecipe = defineRecipe({
  className: 'div-dropzone',
  base: {
    display: 'block',
    width: '100%',
    borderWidth: '2px',
    borderStyle: 'dashed',
    borderColor: 'border.accent',
    borderRadius: 'lg',
    bg: 'bg.accent',
    px: '16px',
    py: '28px',
    textAlign: 'center',
    cursor: 'pointer',
    transitionProperty: 'border-color, background-color',
    transitionDuration: 'fast',
    _hover: { borderColor: 'border.emphasis' },
    _focusVisible: {
      outline: '2px solid',
      outlineColor: 'border.emphasis',
      outlineOffset: '2px',
    },
  },

  variants: {
    state: {
      dragging: {
        borderColor: 'border.emphasis',
        bg: 'bg.subtle',
      },
      invalid: {
        borderColor: 'status.expired.fg',
        bg: 'status.expired.bg',
      },
      disabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
        pointerEvents: 'none',
      },
    },
  },
})
