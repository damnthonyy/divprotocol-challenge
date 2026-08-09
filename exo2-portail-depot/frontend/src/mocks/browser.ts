import { setupWorker } from 'msw/browser'

import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

/**
 * MSW n'est demarre qu'en dev et seulement si VITE_ENABLE_MOCKS vaut "true".
 * Le jour ou NestJS repond, on bascule la variable : aucune ligne de code applicatif
 * a modifier, la couche axios/zod est deja la couche definitive.
 */
export async function startMocks(): Promise<void> {
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCKS !== 'true') return

  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
  })
}
