import { defineGlobalStyles } from '@chakra-ui/react'

/**
 * Site light only : aucune media query prefers-color-scheme, aucun theme switcher.
 * Le fond de page est le fond accent de la charte, les surfaces sont blanches.
 */
export const globalCss = defineGlobalStyles({
  html: {
    colorScheme: 'light',
    scrollBehavior: 'smooth',
  },
  body: {
    bg: 'bg.accent',
    color: 'fg',
    fontFamily: 'body',
    fontSize: 'lg',
    fontWeight: 'normal',
    lineHeight: '1.5',
    minHeight: '100dvh',
    textRendering: 'optimizeLegibility',
  },
  '*::selection': {
    bg: 'div.accentSoft',
    color: 'div.primary',
  },
  '*:focus-visible': {
    outlineColor: 'border.emphasis',
  },
  // Le reveal au scroll ne doit jamais bloquer quelqu'un qui a desactive les animations.
  '*, *::before, *::after': {
    '@media (prefers-reduced-motion: reduce)': {
      animationDuration: '0.01ms !important',
      animationIterationCount: '1 !important',
      transitionDuration: '0.01ms !important',
      scrollBehavior: 'auto !important',
    },
  },
})
