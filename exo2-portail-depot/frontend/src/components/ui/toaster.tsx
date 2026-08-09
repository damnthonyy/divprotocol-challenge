import {
  Toaster as ChakraToaster,
  Portal,
  Spinner,
  Stack,
  Toast,
  createToaster,
} from '@chakra-ui/react'

export const toaster = createToaster({
  placement: 'bottom-end',
  pauseOnPageIdle: true,
  duration: 4000,
})

/** Retours brefs et non bloquants : lien copie, demande creee, envoi echoue. */
export function Toaster() {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: '16px' }}>
        {(toast) => (
          <Toast.Root
            width={{ md: '360px' }}
            bg="bg.surface"
            borderWidth="1px"
            borderColor={toast.type === 'error' ? 'status.expired.fg' : 'border'}
            borderRadius="lg"
            boxShadow="none"
            p="16px"
            gap="8px"
          >
            {toast.type === 'loading' ? (
              <Spinner size="sm" color="fg.accent" />
            ) : (
              <Toast.Indicator
                color={toast.type === 'error' ? 'status.expired.fg' : 'status.complete.fg'}
              />
            )}

            <Stack gap="2px" flex="1" maxWidth="100%">
              {toast.title ? (
                <Toast.Title fontSize="lg" fontWeight="semibold" color="fg">
                  {toast.title}
                </Toast.Title>
              ) : null}
              {toast.description ? (
                <Toast.Description fontSize="sm" color="fg.muted">
                  {toast.description}
                </Toast.Description>
              ) : null}
            </Stack>

            {toast.action ? (
              <Toast.ActionTrigger fontSize="sm" fontWeight="semibold" color="fg.accent">
                {toast.action.label}
              </Toast.ActionTrigger>
            ) : null}

            {toast.meta?.closable ? <Toast.CloseTrigger /> : null}
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  )
}
