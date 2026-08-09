import { useCallback, useRef, useState } from 'react'

import { ApiError } from '@/api/client'
import { uploadFile } from '@/api/public'
import type { DepositFile } from '@/api/schemas'

export interface UploadItem {
  /** Identifiant local : le fichier n'a pas encore d'id serveur. */
  localId: string
  file: File
  state: 'uploading' | 'done' | 'error'
  progress: number
  error?: string
  stored?: DepositFile
}

interface UseUploadQueueArgs {
  token: string
  depositToken: string
  onUploaded?: (file: DepositFile) => void
}

let sequence = 0

/**
 * File d'envoi, un fichier a la fois.
 * Sequentiel plutot que parallele : sur une connexion de client la progression
 * de quatre envois simultanes n'avance nulle part, et un echec devient illisible.
 * Chaque item garde son etat propre pour pouvoir etre reessaye seul.
 */
export function useUploadQueue({ token, depositToken, onUploaded }: UseUploadQueueArgs) {
  const [items, setItems] = useState<UploadItem[]>([])
  const running = useRef(false)
  const pending = useRef<UploadItem[]>([])

  const patch = useCallback((localId: string, changes: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.localId === localId ? { ...item, ...changes } : item)),
    )
  }, [])

  const send = useCallback(
    async (item: UploadItem) => {
      patch(item.localId, { state: 'uploading', progress: 0, error: undefined })

      try {
        const stored = await uploadFile({
          token,
          depositToken,
          file: item.file,
          onProgress: (percent) => patch(item.localId, { progress: percent }),
        })
        patch(item.localId, { state: 'done', progress: 100, stored })
        onUploaded?.(stored)
      } catch (error) {
        patch(item.localId, {
          state: 'error',
          error: error instanceof ApiError ? error.message : "L'envoi a echoue.",
        })
      }
    },
    [token, depositToken, onUploaded, patch],
  )

  const drain = useCallback(async () => {
    if (running.current) return
    running.current = true

    while (pending.current.length > 0) {
      const next = pending.current.shift()
      if (next) await send(next)
    }

    running.current = false
  }, [send])

  const enqueue = useCallback(
    (files: File[]) => {
      const created = files.map<UploadItem>((file) => {
        sequence += 1
        return {
          localId: `upload_${sequence}`,
          file,
          state: 'uploading',
          progress: 0,
        }
      })

      setItems((current) => [...current, ...created])
      pending.current.push(...created)
      void drain()
    },
    [drain],
  )

  const retry = useCallback(
    (localId: string) => {
      const target = items.find((item) => item.localId === localId)
      if (!target) return
      pending.current.push(target)
      void drain()
    },
    [items, drain],
  )

  const remove = useCallback((localId: string) => {
    setItems((current) => current.filter((item) => item.localId !== localId))
  }, [])

  return { items, enqueue, retry, remove }
}
