import { createSlotRecipeContext, type HTMLChakraProps } from '@chakra-ui/react'

import { fileExtensionLabel } from '@/lib/file'
import { formatFileSize } from '@/lib/format'

import { Button } from './button'

const { withProvider, withContext } = createSlotRecipeContext({ key: 'divFileRow' })

const Root = withProvider<
  HTMLDivElement,
  HTMLChakraProps<'div'> & { state?: 'uploading' | 'done' | 'error' }
>('div', 'root')
const Thumb = withContext<HTMLSpanElement, HTMLChakraProps<'span'>>('span', 'thumb')
const Main = withContext<HTMLDivElement, HTMLChakraProps<'div'>>('div', 'main')
const Name = withContext<HTMLParagraphElement, HTMLChakraProps<'p'>>('p', 'name')
const Meta = withContext<HTMLParagraphElement, HTMLChakraProps<'p'>>('p', 'meta')
const Track = withContext<HTMLDivElement, HTMLChakraProps<'div'>>('div', 'track')
const Bar = withContext<HTMLDivElement, HTMLChakraProps<'div'>>('div', 'bar')
const Trailing = withContext<HTMLDivElement, HTMLChakraProps<'div'>>('div', 'trailing')

export interface FileRowProps {
  filename: string
  size?: number
  state: 'uploading' | 'done' | 'error'
  /** 0 a 100, uniquement pertinent en etat `uploading`. */
  progress?: number
  errorMessage?: string
  onRetry?: () => void
  onRemove?: () => void
}

/**
 * Une ligne par piece. L'echec est traite ici et pas au niveau de la liste :
 * un fichier qui echoue ne doit pas faire disparaitre la progression des autres.
 */
export function FileRow({
  filename,
  size,
  state,
  progress = 0,
  errorMessage,
  onRetry,
  onRemove,
}: FileRowProps) {
  const clamped = Math.min(Math.max(progress, 0), 100)

  return (
    <Root state={state}>
      <Thumb aria-hidden="true">{fileExtensionLabel(filename)}</Thumb>

      <Main>
        <Name title={filename}>{filename}</Name>

        {state === 'uploading' ? (
          <Track
            role="progressbar"
            aria-valuenow={Math.round(clamped)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Envoi de ${filename}`}
          >
            <Bar style={{ width: `${clamped}%` }} />
          </Track>
        ) : (
          <Meta>
            {state === 'error'
              ? (errorMessage ?? "L'envoi a echoue.")
              : size !== undefined
                ? formatFileSize(size)
                : null}
          </Meta>
        )}
      </Main>

      <Trailing>
        {state === 'uploading' ? <span>{Math.round(clamped)}%</span> : null}

        {state === 'done' ? (
          <span aria-label="Piece envoyee" role="img">
            ✓
          </span>
        ) : null}

        {state === 'error' && onRetry ? (
          <Button visual="ghost" size="xs" onClick={onRetry}>
            Reessayer
          </Button>
        ) : null}

        {state !== 'uploading' && onRemove ? (
          <Button
            visual="ghost"
            size="xs"
            onClick={onRemove}
            aria-label={`Retirer ${filename}`}
            color="fg.muted"
          >
            ✕
          </Button>
        ) : null}
      </Trailing>
    </Root>
  )
}
