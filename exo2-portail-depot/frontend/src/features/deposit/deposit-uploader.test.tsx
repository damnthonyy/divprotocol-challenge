import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/client'
import * as publicApi from '@/api/public'
import type { PublicRequest } from '@/api/schemas'
import { renderWithProviders, screen, waitFor } from '@/test/render'

import { DepositUploader } from './deposit-uploader'

const request: PublicRequest = {
  label: 'Dossier Martin, pieces 2026',
  status: 'pending',
  expiresAt: new Date(Date.now() + 4 * 86_400_000).toISOString(),
  expectedFiles: 2,
  uploadedCount: 0,
  cabinetName: 'Cabinet Rousseau & Associes',
}

function pdf(name: string) {
  return new File(['contenu'], name, { type: 'application/pdf' })
}

function renderUploader() {
  return renderWithProviders(
    <DepositUploader token="8f3a2c1b" depositToken="deposit.token" request={request} />,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DepositUploader', () => {
  it('affiche la piece envoyee et fait avancer la progression', async () => {
    const user = userEvent.setup()
    vi.spyOn(publicApi, 'uploadFile').mockResolvedValue({
      id: 'file_1',
      filename: 'contrat.pdf',
      size: 7,
      mimeType: 'application/pdf',
      uploadedAt: new Date().toISOString(),
    })

    renderUploader()
    await user.upload(screen.getByTestId('dropzone-input'), pdf('contrat.pdf'))

    expect(await screen.findByText('contrat.pdf')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('1 piece sur 2')).toBeInTheDocument())
  })

  it('propose de reessayer quand un envoi echoue', async () => {
    const user = userEvent.setup()
    const uploadFile = vi
      .spyOn(publicApi, 'uploadFile')
      .mockRejectedValueOnce(new ApiError('Le stockage objet a refuse le fichier.', 502))
      .mockResolvedValueOnce({
        id: 'file_1',
        filename: 'contrat.pdf',
        size: 7,
        mimeType: 'application/pdf',
        uploadedAt: new Date().toISOString(),
      })

    renderUploader()
    await user.upload(screen.getByTestId('dropzone-input'), pdf('contrat.pdf'))

    // L'echec est visible sur la ligne, avec son message et son action.
    expect(await screen.findByText('Le stockage objet a refuse le fichier.')).toBeInTheDocument()
    const retry = await screen.findByRole('button', { name: 'Reessayer' })

    await user.click(retry)

    await waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(2))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Reessayer' })).not.toBeInTheDocument(),
    )
  })

  it('refuse un format non autorise sans lancer d envoi', async () => {
    const user = userEvent.setup()
    const uploadFile = vi.spyOn(publicApi, 'uploadFile')

    renderUploader()
    await user.upload(
      screen.getByTestId('dropzone-input'),
      new File(['x'], 'note.docx', { type: 'application/msword' }),
    )

    expect(uploadFile).not.toHaveBeenCalled()
    expect(screen.getByText("Rien d'envoye pour l'instant")).toBeInTheDocument()
  })
})
