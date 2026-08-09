import { Box, Center, Flex, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { useParams } from 'react-router'

import type { PublicRequest } from '@/api/schemas'
import { Card } from '@/components/ui/card'

import { DepositUploader } from './deposit-uploader'
import { UnlockForm } from './unlock-form'

interface UnlockedSession {
  depositToken: string
  request: PublicRequest
}

/**
 * Page publique du deposant.
 * Aucun compte, aucun AppShell : l'ecran ne montre que ce qui concerne son depot.
 * Le jeton de session reste en memoire — il ne survit volontairement pas a un
 * rechargement, le PIN doit etre ressaisi.
 */
export function DepositPage() {
  const { token = '' } = useParams()
  const [session, setSession] = useState<UnlockedSession | null>(null)

  return (
    <Center minHeight="100dvh" px="16px" py={{ base: '24px', md: '40px' }} alignItems="flex-start">
      <Box width="100%" maxWidth="480px">
        <Flex align="center" gap="8px" mb="16px">
          <Box width="8px" height="8px" borderRadius="full" bg="fg.accent" />
          <Text fontSize="sm" fontWeight="semibold" color="fg.muted">
            Depot securise
          </Text>
        </Flex>

        <Card.Root density="comfortable">
          {session ? (
            <DepositUploader
              token={token}
              depositToken={session.depositToken}
              request={session.request}
            />
          ) : (
            <UnlockForm token={token} onUnlocked={setSession} />
          )}
        </Card.Root>

        <Stack mt="16px" gap="4px">
          <Text fontSize="xs" color="fg.muted">
            Ce lien expire automatiquement. Ne le transfere a personne.
          </Text>
        </Stack>
      </Box>
    </Center>
  )
}
