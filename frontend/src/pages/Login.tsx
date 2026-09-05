import { Alert, Button, Center, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { IconAlertCircle, IconLock } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await login(username, password)
      navigate('/')
    } catch {
      setError('Usuario o contraseña incorrectos.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Center mih="100svh" bg="var(--mantine-color-gray-0)">
      <Paper withBorder shadow="sm" radius="lg" p="xl" w={360}>
        <Stack align="center" gap={4} mb="lg">
          <Text fz={40}>💊</Text>
          <Title order={2} ta="center">
            Acceso personal de farmacia
          </Title>
          <Text c="dimmed" size="sm" ta="center">
            Ingresá con tu usuario para ver análisis y administración.
          </Text>
        </Stack>

        <form onSubmit={onSubmit}>
          <Stack gap="md">
            <TextInput label="Usuario" value={username} onChange={(e) => setUsername(e.currentTarget.value)} autoFocus required />
            <PasswordInput
              label="Contraseña"
              leftSection={<IconLock size={16} />}
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
            />
            {error && (
              <Alert color="red" icon={<IconAlertCircle size={16} />} variant="light">
                {error}
              </Alert>
            )}
            <Button type="submit" loading={enviando} fullWidth>
              Ingresar
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  )
}
