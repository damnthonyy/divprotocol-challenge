import { defineSlotRecipe } from '@chakra-ui/react'

/** Libelle 12px/600 au-dessus du champ, message d'erreur en dessous. */
export const fieldSlotRecipe = defineSlotRecipe({
  className: 'div-field',
  slots: ['root', 'label', 'requiredIndicator', 'helperText', 'errorText'],

  base: {
    root: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      width: '100%',
    },
    label: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: 'sm',
      fontWeight: 'semibold',
      color: 'fg',
    },
    requiredIndicator: {
      color: 'status.expired.fg',
    },
    helperText: {
      fontSize: 'xs',
      color: 'fg.muted',
    },
    errorText: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: 'xs',
      fontWeight: 'semibold',
      color: 'status.expired.fg',
    },
  },
})
