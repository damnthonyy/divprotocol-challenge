import { defineSlotRecipe } from '@chakra-ui/react'

/**
 * Une ligne par piece deposee : vignette d'extension, nom tronque, action a droite.
 * La barre de progression vit dans la ligne elle-meme (pas au-dessus de la liste) :
 * chaque fichier progresse et echoue independamment.
 */
export const fileRowSlotRecipe = defineSlotRecipe({
  className: 'div-file-row',
  slots: ['root', 'thumb', 'main', 'name', 'meta', 'track', 'bar', 'trailing'],

  base: {
    root: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border',
      borderRadius: 'md',
      px: '12px',
      py: '10px',
      bg: 'bg.surface',
      transitionProperty: 'border-color',
      transitionDuration: 'fast',
    },
    thumb: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      width: '32px',
      height: '32px',
      borderRadius: 'md',
      bg: 'bg.subtle',
      color: 'fg.accent',
      fontSize: '2xs',
      fontWeight: 'semibold',
      letterSpacing: '0.02em',
    },
    main: {
      minWidth: 0,
      flex: '1',
    },
    name: {
      fontSize: 'md',
      fontWeight: 'semibold',
      color: 'fg',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    meta: {
      fontSize: 'xs',
      color: 'fg.muted',
    },
    track: {
      mt: '6px',
      height: '4px',
      width: '100%',
      borderRadius: 'full',
      bg: 'border.accent',
      overflow: 'hidden',
    },
    bar: {
      height: '100%',
      borderRadius: 'full',
      bg: 'fg.accent',
      transitionProperty: 'width',
      transitionDuration: 'fast',
      transitionTimingFunction: 'linear',
    },
    trailing: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexShrink: 0,
      fontSize: 'xs',
      color: 'fg.muted',
    },
  },

  variants: {
    state: {
      uploading: {},
      done: {
        trailing: { color: 'status.complete.fg' },
      },
      error: {
        root: { borderColor: 'status.expired.fg', bg: 'status.expired.bg' },
        bar: { bg: 'status.expired.fg' },
        trailing: { color: 'status.expired.fg' },
      },
    },
  },

  defaultVariants: {
    state: 'done',
  },
})
