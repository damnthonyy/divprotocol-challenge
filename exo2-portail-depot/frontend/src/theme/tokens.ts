import { defineTokens } from '@chakra-ui/react'

/**
 * Charte DIV Protocol. Les valeurs viennent des tokens publies dans l'enonce,
 * elles ne sont pas approximees. Aucun composant ne doit ecrire une couleur en dur :
 * tout passe par ces tokens, puis par les semantic tokens.
 */
export const tokens = defineTokens({
  colors: {
    div: {
      primary: { value: '#5100FF' },
      secondary: { value: '#916ED8' },
      black: { value: '#000000' },
      white: { value: '#FFFFFF' },
      grey: { value: '#585858' },
      lightGrey: { value: '#CECECE' },
      borderLight: { value: '#E9E9E9' },
      accentBg: { value: '#F7F6FF' },
      accentSoft: { value: '#DBCDFF' },

      // Aplats de primary utilises pour les fonds discrets (badges d'extension, pills).
      primaryAlpha03: { value: '#5100FF08' },
      primaryAlpha06: { value: '#5100FF0F' },
      primaryAlpha10: { value: '#5100FF1A' },
      primaryAlpha15: { value: '#5100FF26' },
      primaryAlpha18: { value: '#5100FF2E' },
      primaryAlpha35: { value: '#5100FF59' },

      // Semantiques : toujours une couleur de texte posee sur son fond dedie,
      // jamais une couleur crue sur du blanc.
      success: { value: '#12AC64' },
      successBg: { value: '#D9FFED' },
      danger: { value: '#FF4C4C' },
      dangerBg: { value: '#FFD0D0' },
      warning: { value: '#DA9705' },
      warningBg: { value: '#FFEDCA' },
      info: { value: '#52A0EE' },
      infoBg: { value: '#DBEDFF' },
    },
  },

  fonts: {
    heading: { value: "'Inter Variable', Inter, system-ui, -apple-system, sans-serif" },
    body: { value: "'Inter Variable', Inter, system-ui, -apple-system, sans-serif" },
    mono: { value: "'Geist Mono', 'SF Mono', 'Fira Code', ui-monospace, monospace" },
  },

  fontWeights: {
    normal: { value: '400' },
    // La charte n'a que deux graisses : 400 pour le corps, 600 pour titres et CTA.
    semibold: { value: '600' },
  },

  fontSizes: {
    '2xs': { value: '10px' },
    xs: { value: '11px' },
    sm: { value: '12px' },
    md: { value: '13px' },
    lg: { value: '14px' },
    xl: { value: '16px' },
    '2xl': { value: '20px' },
    '3xl': { value: '24px' },
    '4xl': { value: '32px' },
  },

  radii: {
    sm: { value: '4px' },
    md: { value: '8px' },
    lg: { value: '12px' },
    xl: { value: '14px' },
    '2xl': { value: '16px' },
    full: { value: '999px' },
  },

  durations: {
    // Duree unique pour les transitions d'etat, alignee sur les .2s du site public.
    fast: { value: '0.2s' },
    reveal: { value: '0.55s' },
  },

  easings: {
    // Easing signature de la charte, utilise par le reveal au scroll.
    div: { value: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  },
})
