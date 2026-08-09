import '@fontsource-variable/inter'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'
import { startMocks } from './mocks/browser'

async function bootstrap() {
  // MSW doit intercepter avant le premier appel : on attend son demarrage.
  await startMocks()

  const container = document.getElementById('root')
  if (!container) throw new Error('Element #root introuvable.')

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
