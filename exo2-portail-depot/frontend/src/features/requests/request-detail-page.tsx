import { Box, Flex, Skeleton, Stack, Text } from '@chakra-ui/react'
import { Link, useParams } from 'react-router'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CopyField } from '@/components/ui/copy-field'
import { FileRow } from '@/components/ui/file-row'
import { EmptyState, ErrorState } from '@/components/ui/state-panel'
import { StatusBadge } from '@/components/ui/status-badge'
import { useRequest } from '@/hooks/use-requests'
import { formatDate, formatDateTime, formatProgress, isExpired } from '@/lib/format'
import { publicLinkDisplay, publicLinkFor } from '@/lib/links'

export function RequestDetailPage() {
  const { id = '' } = useParams()
  const { data, isPending, isError, error, refetch } = useRequest(id)

  if (isPending) {
    return (
      <Stack gap="16px">
        <Skeleton height="28px" width="240px" borderRadius="sm" />
        <Skeleton height="140px" borderRadius="lg" />
        <Skeleton height="200px" borderRadius="lg" />
      </Stack>
    )
  }

  if (isError) {
    return (
      <Card.Root density="comfortable">
        <ErrorState
          title="Demande indisponible"
          description={error.message}
          onRetry={() => void refetch()}
          actions={
            error.status === 404 ? (
              <Button asChild visual="secondary" size="sm">
                <Link to="/dashboard">Retour au dashboard</Link>
              </Button>
            ) : undefined
          }
        />
      </Card.Root>
    )
  }

  const expired = isExpired(data.expiresAt)

  return (
    <Stack gap="16px">
      <Box>
        <Text asChild fontSize="sm" color="fg.accent" fontWeight="semibold">
          <Link to="/dashboard">← Toutes les demandes</Link>
        </Text>
      </Box>

      <Flex align="flex-start" justify="space-between" gap="12px" wrap="wrap">
        <Box>
          <Text fontSize="2xl" fontWeight="semibold">
            {data.label}
          </Text>
          <Text fontSize="sm" color="fg.muted" mt="2px">
            Creee le {formatDate(data.createdAt)}, expire le {formatDate(data.expiresAt)}
          </Text>
        </Box>
        <StatusBadge status={data.status} />
      </Flex>

      <Card.Root density="comfortable">
        <Stack gap="12px">
          <Text fontSize="sm" fontWeight="semibold">
            Lien de depot
          </Text>

          {expired ? (
            <Text
              fontSize="sm"
              color="status.expired.fg"
              bg="status.expired.bg"
              borderRadius="md"
              px="12px"
              py="8px"
            >
              Ce lien a expire. Cree une nouvelle demande pour relancer ton client.
            </Text>
          ) : (
            <CopyField
              value={publicLinkFor(data.publicToken)}
              display={publicLinkDisplay(data.publicToken)}
              hint={`Expire le ${formatDate(data.expiresAt)}, protege par un code a 4 chiffres.`}
            />
          )}
        </Stack>
      </Card.Root>

      <Card.Root density="comfortable">
        <Stack gap="12px">
          <Flex align="center" justify="space-between" gap="8px">
            <Text fontSize="sm" fontWeight="semibold">
              Pieces recues
            </Text>
            <Text fontSize="sm" color="fg.muted">
              {formatProgress(data.files.length, data.expectedFiles)}
            </Text>
          </Flex>

          {data.files.length === 0 ? (
            <EmptyState
              title="Aucune piece deposee"
              description="Ton client n'a encore rien envoye. Le lien reste valable jusqu'a son expiration."
              icon="—"
            />
          ) : (
            <Stack gap="8px">
              {data.files.map((file) => (
                <Box key={file.id}>
                  <FileRow filename={file.filename} size={file.size} state="done" />
                  <Text fontSize="xs" color="fg.muted" mt="4px" ml="44px">
                    Recue le {formatDateTime(file.uploadedAt)}
                  </Text>
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      </Card.Root>
    </Stack>
  )
}
