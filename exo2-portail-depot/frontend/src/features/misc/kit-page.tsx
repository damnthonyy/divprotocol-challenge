import { Box, Container, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'

import { Badge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CopyField } from '@/components/ui/copy-field'
import { Dropzone } from '@/components/ui/dropzone'
import { Field, Input } from '@/components/ui/field'
import { FileRow } from '@/components/ui/file-row'
import { PinInput } from '@/components/ui/pin-input'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state-panel'
import { StatusBadge } from '@/components/ui/status-badge'

/** En-tete de vignette, calquee sur la presentation du kit dans l'enonce. */
function Sample({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <Box
      borderWidth="1px"
      borderColor="border"
      borderRadius="lg"
      bg="bg.surface"
      overflow="hidden"
    >
      <Box px="16px" py="8px" borderBottomWidth="1px" borderColor="border" bg="bg.accent">
        <Text
          fontSize="xs"
          fontWeight="semibold"
          textTransform="uppercase"
          letterSpacing="0.04em"
          color="fg.accent"
        >
          {title}
        </Text>
        <Text fontSize="xs" color="fg.muted" mt="2px">
          {hint}
        </Text>
      </Box>
      <Box p="20px">{children}</Box>
    </Box>
  )
}

/**
 * Ecran de controle du design system, hors produit.
 * Il sert a comparer le rendu cote a cote avec le mini UI kit de l'enonce et
 * a discuter les composants en entretien sans naviguer dans l'application.
 */
export function KitPage() {
  const [pin, setPin] = useState('4816')

  return (
    <Container maxWidth="960px" px={{ base: '16px', md: '24px' }} py="32px">
      <Stack gap="4px" mb="20px">
        <Text fontSize="2xl" fontWeight="semibold">
          Mini UI kit
        </Text>
        <Text fontSize="lg" color="fg.muted">
          Les composants du portail, rendus dans la charte DIV.
        </Text>
      </Stack>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap="16px">
        <Sample title="Boutons" hint="Survole le primaire : le fond et le texte s'inversent">
          <Stack direction="row" gap="12px" wrap="wrap" align="center">
            <Button>Creer une demande</Button>
            <Button visual="secondary">Annuler</Button>
            <Button size="sm">Deposer</Button>
          </Stack>
        </Sample>

        <Sample title="Statuts de demande" hint="Couleur et fond semantiques, jamais de couleur crue">
          <Stack direction="row" gap="8px" wrap="wrap" align="center">
            <StatusBadge status="pending" />
            <StatusBadge status="complete" />
            <StatusBadge status="expired" />
            <Badge tone="neutral">3 pieces</Badge>
          </Stack>
        </Sample>

        <Sample title="Champ de saisie" hint="Bordure 1px, radius 8px, focus en violet">
          <Stack gap="16px">
            <Field label="Intitule du dossier">
              {(props) => <Input {...props} defaultValue="Dossier Martin, pieces 2026" />}
            </Field>
            <PinInput label="Code PIN" value={pin} onChange={setPin} />
          </Stack>
        </Sample>

        <Sample title="Zone de depot" hint="Bordure pointillee, fond accent au survol">
          <Dropzone onFiles={() => {}} />
        </Sample>

        <Sample title="Fichier depose" hint="Une ligne par piece, action a droite">
          <Stack gap="8px">
            <FileRow filename="contrat-signe.pdf" size={2_516_582} state="done" />
            <FileRow filename="piece-identite.jpg" state="uploading" progress={62} />
            <FileRow
              filename="facture-mars.pdf"
              state="error"
              errorMessage="Le stockage a refuse le fichier."
              onRetry={() => {}}
            />
          </Stack>
        </Sample>

        <Sample title="Carte de demande" hint="Fond blanc, bordure 1px, radius 12px, aucune ombre">
          <Card.Root density="compact">
            <Card.Header>
              <div>
                <Card.Title>Dossier Martin</Card.Title>
                <Card.Meta>Cree le 12 mars, expire dans 4 jours</Card.Meta>
              </div>
              <StatusBadge status="pending" size="sm" />
            </Card.Header>
            <Card.Footer>
              <Text fontSize="sm" color="fg.muted">
                2 pieces sur 4
              </Text>
              <Text fontSize="sm" fontWeight="semibold" color="fg.accent">
                Copier le lien
              </Text>
            </Card.Footer>
          </Card.Root>
        </Sample>

        <Sample title="Lien genere" hint="Monospace, tronque, action de copie">
          <CopyField
            value="https://depot.divprotocol.com/d/8f3a2c1b"
            display="depot.divprotocol.com/d/8f3a2c1b"
            hint="Expire le 19 mars, protege par un code a 4 chiffres"
          />
        </Sample>

        <Sample title="Etat vide" hint="Ne laisse jamais un ecran blanc sans explication">
          <EmptyState
            title="Aucune demande en cours"
            description="Cree une demande pour recevoir des pieces de ton client."
            actions={<Button size="sm">Creer une demande</Button>}
          />
        </Sample>

        <Sample title="Etat de chargement" hint="Le vide temporaire doit se distinguer du vide reel">
          <LoadingState />
        </Sample>

        <Sample title="Etat d'erreur" hint="Toujours accompagne d'une action, jamais d'un message seul">
          <ErrorState
            title="Impossible de charger les demandes"
            description="Le serveur n'a pas repondu."
            onRetry={() => {}}
          />
        </Sample>
      </SimpleGrid>
    </Container>
  )
}
