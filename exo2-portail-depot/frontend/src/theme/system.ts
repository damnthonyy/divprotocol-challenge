import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

import { globalCss } from './global-css'
import { badgeRecipe } from './recipes/badge'
import { buttonRecipe } from './recipes/button'
import { dropzoneRecipe } from './recipes/dropzone'
import { inputRecipe } from './recipes/input'
import { semanticTokens } from './semantic-tokens'
import { cardSlotRecipe } from './slot-recipes/card'
import { copyFieldSlotRecipe } from './slot-recipes/copy-field'
import { fieldSlotRecipe } from './slot-recipes/field'
import { fileRowSlotRecipe } from './slot-recipes/file-row'
import { pinInputSlotRecipe } from './slot-recipes/pin-input'
import { statePanelSlotRecipe } from './slot-recipes/state-panel'
import { tokens } from './tokens'

const config = defineConfig({
  // Prefixe des variables CSS generees : --chakra-colors-div-primary, etc.
  cssVarsPrefix: 'chakra',
  globalCss,
  theme: {
    tokens,
    semanticTokens,
    recipes: {
      divButton: buttonRecipe,
      divBadge: badgeRecipe,
      divInput: inputRecipe,
      divDropzone: dropzoneRecipe,
    },
    slotRecipes: {
      divCard: cardSlotRecipe,
      divField: fieldSlotRecipe,
      divFileRow: fileRowSlotRecipe,
      divPinInput: pinInputSlotRecipe,
      divCopyField: copyFieldSlotRecipe,
      divStatePanel: statePanelSlotRecipe,
    },
  },
})

export const system = createSystem(defaultConfig, config)
