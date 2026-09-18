import { ActionIcon, Alert, Badge, Button, Checkbox, Group, Modal, PasswordInput, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconAlertCircle, IconEdit, IconPlus, IconSearch, IconUserX } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import type { UsuarioAdmin } from '../../types/api'

export function UsuariosAdmin() {
  const { usuario: sesionActual } = useAuth()
  const esAdmin = sesionActual?.es_admin ?? false
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null)

  const [username, setUsername] = useState('')
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [password, setPassword] = useState('')
  const [esAdminNuevo, setEsAdminNuevo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function cargarUsuarios() {
    api
      .get<UsuarioAdmin[]>('/usuarios')
      .then((res) => setUsuarios(res.data))
      .catch(() => notifications.show({ title: 'No se pudo cargar', message: 'No se pudieron cargar los usuarios.', color: 'red' }))
  }

  useEffect(cargarUsuarios, [])

  function abrirNuevo() {
    setEditando(null)
    setUsername('')
    setNombreCompleto('')
    setPassword('')
    setEsAdminNuevo(false)
    setError(null)
    setModalAbierto(true)
  }

  function abrirEdicion(u: UsuarioAdmin) {
    setEditando(u)
    setUsername(u.username)
    setNombreCompleto(u.nombre_completo ?? '')
    setPassword('')
    setEsAdminNuevo(u.es_admin)
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
          ...(esAdmin ? { es_admin: esAdminNuevo } : {}),
        })
        notifications.show({ title: 'Usuario actualizado', message: username, color: 'teal' })
      } else {
        if (!username.trim() || password.length < 6) {
          setError('Completá el usuario y una contraseña de al menos 6 caracteres.')
          return
        }
        await api.post('/usuarios', { username, password, nombre_completo: nombreCompleto || null, es_admin: esAdminNuevo })
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

  const usuariosFiltrados = usuarios.filter((u) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return u.username.toLowerCase().includes(q) || (u.nombre_completo ?? '').toLowerCase().includes(q)
  })

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <Title order={4}>Usuarios del personal ({usuariosFiltrados.length} de {usuarios.length})</Title>
        <Group>
          <TextInput
            placeholder="Buscar por usuario o nombre"
            leftSection={<IconSearch size={16} />}
            value={busqueda}
            onChange={(e) => setBusqueda(e.currentTarget.value)}
          />
          {esAdmin && (
            <Button leftSection={<IconPlus size={16} />} onClick={abrirNuevo}>
              Nuevo usuario
            </Button>
          )}
        </Group>
      </Group>

      <Table striped highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Usuario</Table.Th>
            <Table.Th>Nombre completo</Table.Th>
            <Table.Th>Rol</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th w={100} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {usuariosFiltrados.map((u) => {
            const esUnoMismo = u.username === sesionActual?.username
            const puedeEditar = esAdmin || esUnoMismo
            return (
              <Table.Tr key={u.id} opacity={u.activo ? 1 : 0.5}>
                <Table.Td>
                  <Group gap={6}>
                    {u.username}
                    {esUnoMismo && (
                      <Badge size="xs" variant="light">
                        vos
                      </Badge>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>{u.nombre_completo ?? '—'}</Table.Td>
                <Table.Td>
                  <Badge variant="light" color={u.es_admin ? 'grape' : 'gray'}>
                    {u.es_admin ? 'Administrador' : 'Personal'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color={u.activo ? 'teal' : 'gray'}>
                    {u.activo ? 'Activo' : 'Desactivado'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {puedeEditar && (
                      <ActionIcon variant="subtle" onClick={() => abrirEdicion(u)} aria-label="Editar">
                        <IconEdit size={16} />
                      </ActionIcon>
                    )}
                    {esAdmin &&
                      (u.activo ? (
                        <ActionIcon variant="subtle" color="red" onClick={() => confirmarBaja(u)} aria-label="Desactivar">
                          <IconUserX size={16} />
                        </ActionIcon>
                      ) : (
                        <Button size="xs" variant="subtle" onClick={() => reactivar(u)}>
                          Reactivar
                        </Button>
                      ))}
                  </Group>
                </Table.Td>
              </Table.Tr>
            )
          })}
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
          {esAdmin && (
            <Checkbox
              label="Administrador (puede gestionar usuarios)"
              checked={esAdminNuevo}
              onChange={(e) => setEsAdminNuevo(e.currentTarget.checked)}
            />
          )}
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
