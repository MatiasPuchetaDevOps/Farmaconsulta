import { AppShell, Anchor, Button, Container, Group, Tabs, Text, Title } from '@mantine/core'
import { IconChartBar, IconLogout, IconSearch, IconSettings } from '@tabler/icons-react'
import { useState } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { Administracion } from './pages/Administracion'
import { AnalisisExploratorio } from './pages/AnalisisExploratorio'
import { ConsultaPrecio } from './pages/ConsultaPrecio'
import { Login } from './pages/Login'
import { AuthProvider, useAuth } from './context/AuthContext'

type Pestaña = 'consulta' | 'analisis' | 'administracion'

function PaginaPrincipal() {
  const { usuario, logout, cargando } = useAuth()
  const [pestaña, setPestaña] = useState<Pestaña>('consulta')

  if (cargando) return null

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header>
        <Container size="lg" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="xs">
              <Text fz={26}>💊</Text>
              <Title order={3} fw={700}>
                FarmaConsulta
              </Title>
            </Group>

            {usuario ? (
              <Group gap="md" wrap="nowrap">
                <Text size="sm" c="dimmed" visibleFrom="xs">
                  Sesión iniciada: <Text span fw={600} c="var(--mantine-color-text)">{usuario.nombre_completo ?? usuario.username}</Text>
                </Text>
                <Button variant="subtle" color="gray" size="sm" leftSection={<IconLogout size={16} />} onClick={logout}>
                  Cerrar sesión
                </Button>
              </Group>
            ) : (
              <Anchor component={Link} to="/login" size="sm" c="dimmed">
                Acceso personal de farmacia
              </Anchor>
            )}
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="lg">
          {usuario && (
            <Tabs value={pestaña} onChange={(v) => setPestaña((v as Pestaña) ?? 'consulta')} mb="lg">
              <Tabs.List>
                <Tabs.Tab value="consulta" leftSection={<IconSearch size={16} />}>
                  Consulta de precio
                </Tabs.Tab>
                <Tabs.Tab value="analisis" leftSection={<IconChartBar size={16} />}>
                  Análisis exploratorio
                </Tabs.Tab>
                <Tabs.Tab value="administracion" leftSection={<IconSettings size={16} />}>
                  Administración
                </Tabs.Tab>
              </Tabs.List>
            </Tabs>
          )}

          {!usuario && <ConsultaPrecio />}
          {usuario && pestaña === 'consulta' && <ConsultaPrecio />}
          {usuario && pestaña === 'analisis' && <AnalisisExploratorio />}
          {usuario && pestaña === 'administracion' && <Administracion />}
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}

function RutaLogin() {
  const { usuario, cargando } = useAuth()
  if (cargando) return null
  if (usuario) return <Navigate to="/" replace />
  return <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PaginaPrincipal />} />
          <Route path="/login" element={<RutaLogin />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
