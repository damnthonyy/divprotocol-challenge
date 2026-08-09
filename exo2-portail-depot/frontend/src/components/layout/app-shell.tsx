import { Box, Container, Flex, HStack, Text } from '@chakra-ui/react'
import { Link, Outlet } from 'react-router'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

/** Coquille de l'espace avocat : en-tete fixe, contenu centre, pied discret. */
export function AppShell() {
  const { lawyer, logout } = useAuth()

  return (
    <Flex direction="column" minHeight="100dvh">
      <Box
        as="header"
        borderBottomWidth="1px"
        borderColor="border"
        bg="bg.surface"
        position="sticky"
        top="0"
        zIndex="10"
      >
        <Container maxWidth="960px" px={{ base: '16px', md: '24px' }} py="12px">
          <Flex align="center" justify="space-between" gap="12px">
            <HStack gap="8px" minWidth={0}>
              <Box width="8px" height="8px" borderRadius="full" bg="fg.accent" flexShrink={0} />
              <Text asChild fontWeight="semibold" fontSize="lg" color="fg" truncate>
                <Link to="/dashboard">Portail de depot</Link>
              </Text>
            </HStack>

            <HStack gap="12px">
              {lawyer ? (
                <Text fontSize="sm" color="fg.muted" display={{ base: 'none', sm: 'block' }}>
                  {lawyer.name}
                </Text>
              ) : null}
              <Button visual="secondary" size="xs" onClick={logout}>
                Deconnexion
              </Button>
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Box as="main" flex="1">
        <Container maxWidth="960px" px={{ base: '16px', md: '24px' }} py={{ base: '24px', md: '32px' }}>
          <Outlet />
        </Container>
      </Box>

      <Box as="footer" borderTopWidth="1px" borderColor="border" bg="bg.surface">
        <Container maxWidth="960px" px={{ base: '16px', md: '24px' }} py="16px">
          <Text fontSize="xs" color="fg.muted">
            DIV Protocol — transmission de pieces tracee.
          </Text>
        </Container>
      </Box>
    </Flex>
  )
}
