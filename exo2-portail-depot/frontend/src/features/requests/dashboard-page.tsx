import { Box, Flex, SimpleGrid, Skeleton, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'

import type { DepositRequest } from '@/api/schemas'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, ErrorState } from '@/components/ui/state-panel'
import { toaster } from '@/components/ui/toaster'
import { useRequests } from '@/hooks/use-requests'
import { publicLinkFor } from '@/lib/links'

import { NewRequestDialog } from './new-request-dialog'
import { RequestCard } from './request-card'

export function DashboardPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { data, isPending, isError, error, refetch, isRefetching } = useRequests()

  const copyLink = async (request: DepositRequest) => {
    try {
      await navigator.clipboard.writeText(publicLinkFor(request.publicToken))
      toaster.create({ type: 'success', title: 'Lien copie' })
    } catch {
      toaster.create({
        type: 'error',
        title: 'Copie impossible',
        description: 'Copie le lien depuis la page de la demande.',
      })
    }
  }

  return (
    <Stack gap="20px">
      <Flex align="flex-start" justify="space-between" gap="12px" wrap="wrap">
        <Box>
          <Text fontSize="2xl" fontWeight="semibold">
            Demandes de depot
          </Text>
          <Text fontSize="lg" color="fg.muted">
            Suis l'avancement des pieces attendues.
          </Text>
        </Box>

        <Button size="sm" onClick={() => setDialogOpen(true)}>
          Creer une demande
        </Button>
      </Flex>

      {isPending ? (
        <SimpleGrid columns={{ base: 1, md: 2 }} gap="12px">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height="118px" borderRadius="lg" />
          ))}
        </SimpleGrid>
      ) : isError ? (
        <Card.Root density="comfortable">
          <ErrorState
            title="Impossible de charger les demandes"
            description={error.message}
            onRetry={() => void refetch()}
          />
        </Card.Root>
      ) : data.length === 0 ? (
        <Card.Root density="comfortable">
          <EmptyState
            title="Aucune demande en cours"
            description="Cree une demande pour recevoir des pieces de ton client."
            actions={
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                Creer une demande
              </Button>
            }
          />
        </Card.Root>
      ) : (
        <Stack gap="12px" opacity={isRefetching ? 0.6 : 1} transition="opacity 0.2s">
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="12px">
            {data.map((request) => (
              <RequestCard key={request.id} request={request} onCopyLink={copyLink} />
            ))}
          </SimpleGrid>
        </Stack>
      )}

      <NewRequestDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Stack>
  )
}
