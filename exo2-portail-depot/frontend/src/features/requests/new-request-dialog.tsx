import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Dialog, Portal, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { ApiError } from '@/api/client'
import { createRequestInputSchema, type CreateRequestInput, type CreatedRequest } from '@/api/schemas'
import { Button } from '@/components/ui/button'
import { CopyField } from '@/components/ui/copy-field'
import { Field, Input } from '@/components/ui/field'
import { useCreateRequest } from '@/hooks/use-requests'
import { formatDate } from '@/lib/format'
import { publicLinkFor } from '@/lib/links'

interface NewRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Creation d'une demande, puis affichage du lien et du PIN.
 * Le PIN n'est montre qu'ici : l'API ne le renvoie plus ensuite, donc l'ecran
 * insiste sur le fait qu'il faut le transmettre maintenant.
 */
export function NewRequestDialog({ open, onOpenChange }: NewRequestDialogProps) {
  const [created, setCreated] = useState<CreatedRequest | null>(null)
  const mutation = useCreateRequest()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateRequestInput>({
    resolver: zodResolver(createRequestInputSchema),
    defaultValues: { label: '', expectedFiles: 4, expiresInDays: 7 },
  })

  const close = () => {
    onOpenChange(false)
    // Laisse l'animation de fermeture se terminer avant de vider l'ecran.
    setTimeout(() => {
      setCreated(null)
      reset()
      mutation.reset()
    }, 200)
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      setCreated(await mutation.mutateAsync(values))
    } catch (error) {
      setError('root', {
        message: error instanceof ApiError ? error.message : 'Creation impossible.',
      })
    }
  })

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(event) => (event.open ? onOpenChange(true) : close())}
      placement="center"
      motionPreset="slide-in-bottom"
    >
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.400" />
        <Dialog.Positioner p="16px">
          <Dialog.Content
            bg="bg.surface"
            borderWidth="1px"
            borderColor="border"
            borderRadius="lg"
            boxShadow="none"
            maxWidth="440px"
            width="100%"
            p="24px"
          >
            {created ? (
              <Stack gap="16px">
                <Box>
                  <Dialog.Title fontSize="xl" fontWeight="semibold">
                    Demande creee
                  </Dialog.Title>
                  <Text fontSize="sm" color="fg.muted" mt="4px">
                    Transmets le lien et le code a ton client. Le code ne sera plus affiche.
                  </Text>
                </Box>

                <CopyField
                  value={publicLinkFor(created.publicToken)}
                  hint={`Expire le ${formatDate(created.expiresAt)}, protege par un code a 4 chiffres.`}
                />

                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb="6px">
                    Code PIN
                  </Text>
                  <Stack direction="row" gap="8px">
                    {created.pin.split('').map((digit, index) => (
                      <Box
                        key={index}
                        width="40px"
                        height="44px"
                        borderWidth="1px"
                        borderColor="border.accent"
                        borderRadius="md"
                        bg="bg.accent"
                        color="fg.accent"
                        fontSize="xl"
                        fontWeight="semibold"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {digit}
                      </Box>
                    ))}
                  </Stack>
                </Box>

                <Button size="sm" onClick={close} fullWidth>
                  Terminer
                </Button>
              </Stack>
            ) : (
              <form onSubmit={onSubmit} noValidate>
                <Stack gap="16px">
                  <Box>
                    <Dialog.Title fontSize="xl" fontWeight="semibold">
                      Nouvelle demande
                    </Dialog.Title>
                    <Text fontSize="sm" color="fg.muted" mt="4px">
                      Un lien expirable protege par un code sera genere.
                    </Text>
                  </Box>

                  <Field
                    label="Intitule du dossier"
                    error={errors.label?.message}
                    helperText="Visible par le client sur la page de depot."
                    required
                  >
                    {(props) => (
                      <Input
                        {...props}
                        {...register('label')}
                        placeholder="Dossier Martin, pieces 2026"
                        autoFocus
                      />
                    )}
                  </Field>

                  <SimpleGrid columns={{ base: 1, sm: 2 }} gap="12px">
                    <Field label="Pieces attendues" error={errors.expectedFiles?.message}>
                      {(props) => (
                        <Input
                          {...props}
                          {...register('expectedFiles', { valueAsNumber: true })}
                          type="number"
                          min={1}
                          max={50}
                        />
                      )}
                    </Field>

                    <Field label="Expire dans (jours)" error={errors.expiresInDays?.message}>
                      {(props) => (
                        <Input
                          {...props}
                          {...register('expiresInDays', { valueAsNumber: true })}
                          type="number"
                          min={1}
                          max={30}
                        />
                      )}
                    </Field>
                  </SimpleGrid>

                  {errors.root ? (
                    <Text
                      role="alert"
                      fontSize="sm"
                      fontWeight="semibold"
                      color="status.expired.fg"
                      bg="status.expired.bg"
                      borderRadius="md"
                      px="12px"
                      py="8px"
                    >
                      {errors.root.message}
                    </Text>
                  ) : null}

                  <Stack direction={{ base: 'column-reverse', sm: 'row' }} gap="8px" justify="flex-end">
                    <Button type="button" visual="secondary" size="sm" onClick={close}>
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      loading={mutation.isPending}
                      loadingText="Creation"
                    >
                      Creer la demande
                    </Button>
                  </Stack>
                </Stack>
              </form>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
