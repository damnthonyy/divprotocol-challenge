import { Box, Flex, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'

import type { PublicRequest } from '@/api/schemas'
import { Dropzone } from '@/components/ui/dropzone'
import { FileRow } from '@/components/ui/file-row'
import { EmptyState } from '@/components/ui/state-panel'
import { toaster } from '@/components/ui/toaster'
import { useUploadQueue } from '@/hooks/use-upload-queue'
import { formatDate, formatProgress } from '@/lib/format'
import type { FileRejection } from '@/lib/file'

interface DepositUploaderProps {
  token: string
  depositToken: string
  request: PublicRequest
}

export function DepositUploader({ token, depositToken, request }: DepositUploaderProps) {
  const [uploadedCount, setUploadedCount] = useState(request.uploadedCount)

  const { items, enqueue, retry, remove } = useUploadQueue({
    token,
    depositToken,
    onUploaded: () => setUploadedCount((count) => count + 1),
  })

  const handleReject = (rejections: FileRejection[]) => {
    for (const rejection of rejections) {
      toaster.create({
        type: 'error',
        title: rejection.file.name,
        description: rejection.message,
      })
    }
  }

  const failed = items.filter((item) => item.state === 'error').length

  return (
    <Stack gap="16px">
      <Stack gap="4px">
        <Text fontSize="xl" fontWeight="semibold">
          {request.label}
        </Text>
        <Text fontSize="sm" color="fg.muted">
          {request.cabinetName} — lien valable jusqu'au {formatDate(request.expiresAt)}
        </Text>
      </Stack>

      <Flex
        align="center"
        justify="space-between"
        gap="8px"
        bg="bg.accent"
        borderWidth="1px"
        borderColor="border.accent"
        borderRadius="md"
        px="12px"
        py="8px"
      >
        <Text fontSize="sm" color="fg.muted">
          Progression
        </Text>
        <Text fontSize="sm" fontWeight="semibold" color="fg.accent">
          {formatProgress(uploadedCount, request.expectedFiles)}
        </Text>
      </Flex>

      <Dropzone onFiles={enqueue} onReject={handleReject} />

      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb="8px">
          Pieces envoyees
        </Text>

        {items.length === 0 ? (
          <EmptyState
            title="Rien d'envoye pour l'instant"
            description="Depose tes documents ci-dessus, ils partent automatiquement."
            icon="—"
          />
        ) : (
          <Stack gap="8px">
            {items.map((item) => (
              <FileRow
                key={item.localId}
                filename={item.file.name}
                size={item.file.size}
                state={item.state}
                progress={item.progress}
                errorMessage={item.error}
                onRetry={item.state === 'error' ? () => retry(item.localId) : undefined}
                onRemove={item.state !== 'uploading' ? () => remove(item.localId) : undefined}
              />
            ))}
          </Stack>
        )}
      </Box>

      {failed > 0 ? (
        <Text
          role="status"
          fontSize="sm"
          color="status.expired.fg"
          bg="status.expired.bg"
          borderRadius="md"
          px="12px"
          py="8px"
        >
          {failed} envoi{failed > 1 ? 's ont' : ' a'} echoue. Utilise « Reessayer » sur la ligne
          concernee.
        </Text>
      ) : null}

      {uploadedCount >= request.expectedFiles ? (
        <Text
          role="status"
          fontSize="sm"
          fontWeight="semibold"
          color="status.complete.fg"
          bg="status.complete.bg"
          borderRadius="md"
          px="12px"
          py="8px"
        >
          Toutes les pieces attendues sont arrivees. Ton avocat en est informe.
        </Text>
      ) : null}
    </Stack>
  )
}
