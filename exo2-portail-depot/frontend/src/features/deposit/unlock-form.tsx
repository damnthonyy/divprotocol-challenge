import { Stack, Text } from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { ApiError } from '@/api/client'
import { unlock } from '@/api/public'
import type { UnlockResponse } from '@/api/schemas'
import { Button } from '@/components/ui/button'
import { PinInput } from '@/components/ui/pin-input'
import { ErrorState } from '@/components/ui/state-panel'

interface UnlockFormProps {
  token: string
  onUnlocked: (session: UnlockResponse) => void
}

export function UnlockForm({ token, onUnlocked }: UnlockFormProps) {
  const [pin, setPin] = useState('')

  const mutation = useMutation<UnlockResponse, ApiError, string>({
    mutationFn: (value) => unlock(token, value),
    onSuccess: onUnlocked,
    onError: () => setPin(''),
  })

  const error = mutation.error

  /**
   * L'API renvoie 429 dans deux situations tres differentes :
   *  - `PIN_LOCKED` : le lien est verrouille apres trop de codes errones ;
   *  - `RATE_LIMITED` : simple limitation de debit, qui se leve en une minute.
   *
   * On se fie donc au `code` et pas au seul statut. Traiter les deux pareil
   * afficherait une impasse definitive a quelqu'un qui n'a qu'a patienter.
   */
  const terminal = error?.status === 410 || error?.code === 'PIN_LOCKED'

  if (terminal) {
    const expired = error?.status === 410
    return (
      <ErrorState
        title={expired ? 'Ce lien a expire' : 'Lien verrouille'}
        description={
          expired
            ? 'Demande un nouveau lien a ton avocat pour deposer tes pieces.'
            : (error?.message ?? 'Trop de codes errones ont ete saisis. Contacte ton avocat.')
        }
        icon="!"
      />
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (pin.length === 4) mutation.mutate(pin)
      }}
    >
      <Stack gap="16px">
        <Stack gap="4px">
          <Text fontSize="xl" fontWeight="semibold">
            Saisis ton code
          </Text>
          <Text fontSize="sm" color="fg.muted">
            Le code a quatre chiffres t'a ete transmis par ton avocat.
          </Text>
        </Stack>

        <PinInput
          label="Code PIN"
          value={pin}
          onChange={setPin}
          onComplete={(value) => mutation.mutate(value)}
          invalid={mutation.isError}
          disabled={mutation.isPending}
          autoFocus
          aria-describedby={mutation.isError ? 'pin-error' : undefined}
        />

        {mutation.isError ? (
          <Text
            id="pin-error"
            role="alert"
            fontSize="sm"
            fontWeight="semibold"
            color="status.expired.fg"
            bg="status.expired.bg"
            borderRadius="md"
            px="12px"
            py="8px"
          >
            {mutation.error.message}
          </Text>
        ) : null}

        <Button
          type="submit"
          size="sm"
          fullWidth
          disabled={pin.length !== 4}
          loading={mutation.isPending}
          loadingText="Verification"
        >
          Acceder au depot
        </Button>
      </Stack>
    </form>
  )
}
