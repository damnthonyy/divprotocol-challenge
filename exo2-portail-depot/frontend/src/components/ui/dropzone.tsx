import { Text, createRecipeContext, type HTMLChakraProps } from '@chakra-ui/react'
import { useRef } from 'react'

import { useFileDrop } from '@/hooks/use-file-drop'
import { ACCEPT_ATTRIBUTE, type FileRejection } from '@/lib/file'

const { withContext } = createRecipeContext({ key: 'divDropzone' })

const DropzoneSurface = withContext<
  HTMLDivElement,
  HTMLChakraProps<'div'> & { state?: 'dragging' | 'invalid' | 'disabled' }
>('div')

export interface DropzoneProps {
  onFiles: (files: File[]) => void
  onReject?: (rejections: FileRejection[]) => void
  disabled?: boolean
  title?: string
  hint?: string
}

/**
 * Zone de depot. Un input file cache reste la source de verite : le clic et le
 * clavier passent par lui, le glisser-deposer n'est qu'un chemin supplementaire.
 */
export function Dropzone({
  onFiles,
  onReject,
  disabled,
  title = 'Depose tes pieces ici',
  hint = 'PDF, JPG ou PNG, 20 Mo maximum par fichier',
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { isDragging, handleFiles, dropHandlers } = useFileDrop({ onFiles, onReject, disabled })

  const openPicker = () => {
    if (!disabled) inputRef.current?.click()
  }

  return (
    <DropzoneSurface
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-label={title}
      state={disabled ? 'disabled' : isDragging ? 'dragging' : undefined}
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openPicker()
        }
      }}
      {...dropHandlers}
    >
      <Text fontSize="lg" fontWeight="semibold" color="fg.accent">
        {isDragging ? 'Relache pour deposer' : title}
      </Text>
      <Text fontSize="sm" color="fg.muted" mt="4px">
        {hint}
      </Text>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        disabled={disabled}
        onChange={(event) => {
          handleFiles(event.target.files)
          // Permet de re-selectionner le meme fichier apres un echec d'envoi.
          event.target.value = ''
        }}
        style={{ display: 'none' }}
        data-testid="dropzone-input"
      />
    </DropzoneSurface>
  )
}
