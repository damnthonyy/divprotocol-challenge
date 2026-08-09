import { ChakraProvider } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'

import { system } from '@/theme/system'

/**
 * Pas de next-themes ici, contrairement au snippet par defaut de Chakra :
 * la charte impose un site light only, donc aucun gestionnaire de theme a embarquer.
 */
export function Provider({ children }: PropsWithChildren) {
  return <ChakraProvider value={system}>{children}</ChakraProvider>
}
