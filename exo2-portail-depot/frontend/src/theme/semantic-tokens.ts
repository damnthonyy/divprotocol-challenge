import { defineSemanticTokens } from '@chakra-ui/react'

/**
 * Couche d'intention : les composants ne referencent que ces noms.
 * Le site est light only (pas de dark mode dans la charte), donc une seule valeur
 * par token — mais la couche existe pour que renommer une couleur reste local.
 */
export const semanticTokens = defineSemanticTokens({
  colors: {
    bg: {
      DEFAULT: { value: '{colors.div.white}' },
      surface: { value: '{colors.div.white}' },
      accent: { value: '{colors.div.accentBg}' },
      subtle: { value: '{colors.div.primaryAlpha06}' },
    },
    fg: {
      DEFAULT: { value: '{colors.div.black}' },
      muted: { value: '{colors.div.grey}' },
      subtle: { value: '{colors.div.lightGrey}' },
      accent: { value: '{colors.div.primary}' },
      inverted: { value: '{colors.div.white}' },
    },
    border: {
      DEFAULT: { value: '{colors.div.borderLight}' },
      accent: { value: '{colors.div.accentSoft}' },
      emphasis: { value: '{colors.div.primary}' },
    },

    // Etats d'une demande de depot. Le mapping statut -> couleur est defini ici
    // et nulle part ailleurs : un seul endroit a changer si le back ajoute un statut.
    status: {
      pending: {
        fg: { value: '{colors.div.warning}' },
        bg: { value: '{colors.div.warningBg}' },
      },
      complete: {
        fg: { value: '{colors.div.success}' },
        bg: { value: '{colors.div.successBg}' },
      },
      expired: {
        fg: { value: '{colors.div.danger}' },
        bg: { value: '{colors.div.dangerBg}' },
      },
      info: {
        fg: { value: '{colors.div.info}' },
        bg: { value: '{colors.div.infoBg}' },
      },
      neutral: {
        fg: { value: '{colors.div.primary}' },
        bg: { value: '{colors.div.primaryAlpha06}' },
      },
    },
  },
})
