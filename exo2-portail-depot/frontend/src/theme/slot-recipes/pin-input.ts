import { defineSlotRecipe } from '@chakra-ui/react'

/**
 * Code PIN a 4 chiffres. Cases 40x44, bordure accent doux, fond accent,
 * chiffre 16px/600 en primary. Mappe sur l'anatomie du PinInput de Chakra v3.
 */
export const pinInputSlotRecipe = defineSlotRecipe({
  className: 'div-pin-input',
  slots: ['root', 'label', 'control', 'input'],

  base: {
    root: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
    label: {
      fontSize: 'sm',
      fontWeight: 'semibold',
      color: 'fg',
    },
    control: {
      display: 'flex',
      gap: '8px',
    },
    input: {
      width: '40px',
      height: '44px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border.accent',
      borderRadius: 'md',
      bg: 'bg.accent',
      color: 'fg.accent',
      fontSize: 'xl',
      fontWeight: 'semibold',
      textAlign: 'center',
      caretColor: 'var(--chakra-colors-div-primary)',
      transitionProperty: 'border-color, box-shadow',
      transitionDuration: 'fast',
      _hover: { borderColor: 'border.emphasis' },
      _focusVisible: {
        outline: 'none',
        borderColor: 'border.emphasis',
        boxShadow: 'inset 0 0 0 1px var(--chakra-colors-div-primary)',
      },
      _invalid: {
        borderColor: 'status.expired.fg',
        bg: 'status.expired.bg',
        color: 'status.expired.fg',
      },
      _disabled: { opacity: 0.5, cursor: 'not-allowed' },
    },
  },
})
