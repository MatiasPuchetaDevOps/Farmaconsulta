import { ActionIcon, Alert, Badge, Button, Group, Modal, PasswordInput, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconAlertCircle, IconEdit, IconPlus, IconUserX } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import type { UsuarioAdmin } from '../../types/api'

export function UsuariosAdmin() {
  const { usuario: sesionActual } = useAuth()
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null)

  const [username, setUsername] = useState('')
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function cargarUsuarios() {
    api.get<UsuarioAdmin[]>('/usuarios').then((res) => setUsuarios(res.data))
  }

  useEffect(cargarUsuarios, [])

  function abrirNuevo() {
    setEditando(null)
    setUsername('')
    setNombreCompleto('')
    setPassword('')
    setError(null)
    setModalAbierto(true)
  }

  function abrirEdicion(u: UsuarioAdmin) {
    setEditando(u)
    setUsername(u.username)
    setNombreCompleto(u.nombre_completo ?? '')
    setPassword('')
    setError(null)
    setModalAbierto(true)
  }

  async function guardar() {
    setError(null)
    setEnviando(true)
    try {
      if (editando) {
        await api.put(`/usuarios/${editando.id}`, {
          nombre_completo: nombreCompleto,
          password: password || null,
        })
        notifications.show({ title: 'Usuario actualizado', message: username, color: 'teal' })
      } else {
        if (!username.trim() || password.length < 6) {
          setError('Completá el usuario y una contraseña de al menos 6 caracteres.')
          return
        }
        await api.post('/usuarios', { username, password, nombre_completo: nombreCompleto || null })
        notifications.show({ title: 'Usuario creado', message: username, color: 'teal' })
      }
      setModalAbierto(false)
      cargarUsuarios()
    } catch (err: unknown) {
      const detalle = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detalle ?? 'No se pudo guardar el usuario.')
    } finally {
      setEnviando(false)
    }
  }

  function confirmarBaja(u: UsuarioAdmin) {
    modals.openConfirmModal({
      title: 'Desactivar usuario',
      children: <Text size="sm">'{u.username}' no va a poder iniciar sesión hasta que lo reactives.</Text>,
      labels: { confirm: 'Desactivar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/usuarios/${u.id}`)
          notifications.show({ title: 'Usuario desactivado', message: u.username, color: 'red' })
          cargarUsuarios()
        } catch (err: unknown) {
          const detalle = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          notifications.show({ title: 'No se pudo desactivar', message: detalle ?? 'Intentá de nuevo.', color: 'red' })
        }
      },
    })
  }

  async function reactivar(u: UsuarioAdmin) {
    await api.put(`/usuarios/${u.id}`, { activo: true })
    notifications.show({ title: 'Usuario reactivado', message: u.username, color: 'teal' })
    cargarUsuarios()
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={4}>Usuarios del personal ({usuarios.length})</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={abrirNuevo}>
          Nuevo usuario
        </Button>
      </Group>

      <Table striped highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Usuario</Table.Th>
            <Table.Th>Nombre completo</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th w={100} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {usuarios.map((u) => (
            <Table.Tr key={u.id} opacity={u.activo ? 1 : 0.5}>
              <Table.Td>
                <Group gap={6}>
                  {u.username}
                  {u.username === sesionActual?.username && (
                    <Badge size="xs" variant="light">
                      vos
                    </Badge>
                  )}
                </Group>
              </Table.Td>
              <Table.Td>{u.nombre_completo ?? '—'}</Table.Td>
              <Table.Td>
                <Badge variant="light" color={u.activo ? 'teal' : 'gray'}>
                  {u.activo ? 'Activo' : 'Desactivado'}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap={4}>
                  <ActionIcon variant="subtle" onClick={() => abrirEdicion(u)} aria-label="Editar">
                    <IconEdit size={16} />
                  </ActionIcon>
                  {u.activo ? (
                    <ActionIcon variant="subtle" color="red" onClick={() => confirmarBaja(u)} aria-label="Desactivar">
                      <IconUserX size={16} />
                    </ActionIcon>
                  ) : (
                    <Button size="xs" variant="subtle" onClick={() => reactivar(u)}>
                      Reactivar
                    </Button>
                  )}
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={modalAbierto} onClose={() => setModalAbierto(false)} title={editando ? 'Editar usuario' : 'Nuevo usuario'}>
        <Stack gap="md">
          <TextInput label="Usuario" value={username} onChange={(e) => setUsername(e.currentTarget.value)} disabled={!!editando} data-autofocus />
          <TextInput label="Nombre completo" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.currentTarget.value)} />
          <PasswordInput
            label={editando ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            description={editando ? 'Dejá vacío para mantener la contraseña actual.' : 'Mínimo 6 caracteres.'}
          />
          {error && (
            <Alert color="red" icon={<IconAlertCircle size={16} />} variant="light">
              {error}
            </Alert>
          )}
          <Button onClick={guardar} loading={enviando}>
            Guardar
          </Button>
        </Stack>
      </Modal>
    </Stack>
  )
}
