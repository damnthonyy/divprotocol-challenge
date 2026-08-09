import { api, parse } from './client'
import {
  depositFileSchema,
  unlockResponseSchema,
  type DepositFile,
  type UnlockResponse,
} from './schemas'

export async function unlock(token: string, pin: string): Promise<UnlockResponse> {
  const { data } = await api.post(`/public/${token}/unlock`, { pin })
  return parse(unlockResponseSchema, data)
}

export interface UploadFileArgs {
  token: string
  depositToken: string
  file: File
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

/**
 * Envoi d'une piece.
 * `onUploadProgress` est la raison d'etre d'axios ici : `fetch` n'expose pas
 * la progression d'un upload, et cette progression est une exigence du produit.
 */
export async function uploadFile({
  token,
  depositToken,
  file,
  onProgress,
  signal,
}: UploadFileArgs): Promise<DepositFile> {
  const form = new FormData()
  form.append('file', file)

  const { data } = await api.post(`/public/${token}/files`, form, {
    signal,
    headers: {
      'Content-Type': 'multipart/form-data',
      // Session de depot anonyme, distincte du JWT avocat.
      'X-Deposit-Token': depositToken,
    },
    onUploadProgress: (event) => {
      if (!event.total) return
      onProgress?.(Math.round((event.loaded / event.total) * 100))
    },
  })

  return parse(depositFileSchema, data)
}
