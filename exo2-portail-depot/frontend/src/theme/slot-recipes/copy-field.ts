import { defineSlotRecipe } from '@chakra-ui/react'

/**
 * Lien genere : monospace, tronque, action de copie a droite, fond accent.
 *
 * `root` est le conteneur externe et non la boite bordee : l'indication sous le
 * champ doit rester dans le meme contexte de styles que le reste du composant.
 * C'est `field` qui porte la bordure.
 */
export const copyFieldSlotRecipe = defineSlotRecipe({
  className: 'div-copy-field',
  slots: ['root', 'field', 'value', 'action', 'hint'],

  base: {
    root: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
    },
    field: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border',
      borderRadius: 'md',
      bg: 'bg.accent',
      px: '12px',
      py: '10px',
    },
    value: {
      flex: '1',
      minWidth: 0,
      fontFamily: 'mono',
      fontSize: 'sm',
      color: 'fg.accent',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    action: {
      flexShrink: 0,
      fontSize: 'xs',
      fontWeight: 'semibold',
      color: 'fg.accent',
      bg: 'transparent',
      border: 'none',
      cursor: 'pointer',
      px: '4px',
      py: '2px',
      borderRadius: 'sm',
      transitionProperty: 'color, background-color',
      transitionDuration: 'fast',
      _hover: { bg: 'bg.subtle' },
      _focusVisible: {
        outline: '2px solid',
        outlineColor: 'border.emphasis',
        outlineOffset: '1px',
      },
    },
    hint: {
      fontSize: 'xs',
      color: 'fg.muted',
      mt: '8px',
    },
  },
})
