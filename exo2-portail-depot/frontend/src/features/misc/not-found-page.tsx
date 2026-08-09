import { Box, Center } from '@chakra-ui/react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/state-panel'

export function NotFoundPage() {
  return (
    <Center minHeight="100dvh" px="16px">
      <Box width="100%" maxWidth="420px">
        <Card.Root density="comfortable">
          <EmptyState
            title="Page introuvable"
            description="Le lien est peut-etre incomplet ou n'existe plus."
            icon="?"
            actions={
              <Button asChild visual="secondary" size="sm">
                <Link to="/dashboard">Retour a l'accueil</Link>
              </Button>
            }
          />
        </Card.Root>
      </Box>
    </Center>
  )
}
