import { useCallback, useRef, useState, type DragEvent } from 'react'

import { partitionFiles, type FileRejection } from '@/lib/file'

interface UseFileDropOptions {
  onFiles: (files: File[]) => void
  onReject?: (rejections: FileRejection[]) => void
  disabled?: boolean
}

/**
 * Glisser-deposer natif, ~60 lignes, plutot qu'une dependance.
 * Le compteur de profondeur est necessaire : dragleave se declenche aussi quand
 * le curseur passe sur un enfant de la zone, ce qui ferait clignoter l'etat survole.
 */
export function useFileDrop({ onFiles, onReject, disabled }: UseFileDropOptions) {
  const [isDragging, setIsDragging] = useState(false)
  const depth = useRef(0)

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      const { accepted, rejected } = partitionFiles(Array.from(fileList))
      if (rejected.length > 0) onReject?.(rejected)
      if (accepted.length > 0) onFiles(accepted)
    },
    [onFiles, onReject],
  )

  const onDragEnter = useCallback(
    (event: DragEvent) => {
      if (disabled) return
      event.preventDefault()
      depth.current += 1
      setIsDragging(true)
    },
    [disabled],
  )

  const onDragOver = useCallback(
    (event: DragEvent) => {
      if (disabled) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    },
    [disabled],
  )

  const onDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault()
    depth.current -= 1
    if (depth.current <= 0) {
      depth.current = 0
      setIsDragging(false)
    }
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      if (disabled) return
      event.preventDefault()
      depth.current = 0
      setIsDragging(false)
      handleFiles(event.dataTransfer.files)
    },
    [disabled, handleFiles],
  )

  return {
    isDragging,
    handleFiles,
    dropHandlers: { onDragEnter, onDragOver, onDragLeave, onDrop },
  }
}
