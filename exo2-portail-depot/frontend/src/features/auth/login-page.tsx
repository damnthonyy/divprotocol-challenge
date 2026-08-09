import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Center, Stack, Text } from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router'

import { ApiError } from '@/api/client'
import { loginInputSchema, type LoginInput } from '@/api/schemas'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { useAuth } from '@/hooks/use-auth'

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: '', password: '' },
  })

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values)
      void navigate('/dashboard', { replace: true })
    } catch (error) {
      setError('root', {
        message: error instanceof ApiError ? error.message : 'Connexion impossible.',
      })
    }
  })

  return (
    <Center minHeight="100dvh" px="16px" py="32px">
      <Box width="100%" maxWidth="380px">
        <Stack gap="4px" mb="20px">
          <Text fontSize="2xl" fontWeight="semibold">
            Portail de depot
          </Text>
          <Text fontSize="lg" color="fg.muted">
            Espace reserve au cabinet.
          </Text>
        </Stack>

        <Card.Root density="comfortable">
          <form onSubmit={onSubmit} noValidate>
            <Stack gap="16px">
              <Field label="Adresse electronique" error={errors.email?.message} required>
                {(props) => (
                  <Input
                    {...props}
                    {...register('email')}
                    type="email"
                    autoComplete="username"
                    placeholder="avocat@cabinet.fr"
                  />
                )}
              </Field>

              <Field label="Mot de passe" error={errors.password?.message} required>
                {(props) => (
                  <Input
                    {...props}
                    {...register('password')}
                    type="password"
                    autoComplete="current-password"
                  />
                )}
              </Field>

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

              <Button type="submit" size="sm" fullWidth loading={isSubmitting} loadingText="Connexion">
                Se connecter
              </Button>
            </Stack>
          </form>
        </Card.Root>

        <Text fontSize="xs" color="fg.muted" mt="12px" textAlign="center">
          Demo : avocat@divprotocol.com / demo1234
        </Text>
      </Box>
    </Center>
  )
}
