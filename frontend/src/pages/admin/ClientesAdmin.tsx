import { ActionIcon, Badge, Button, Group, Modal, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconEdit, IconPlus, IconSearch, IconTrashX } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { Cliente, ClienteIn } from '../../types/api'

const VACIO: ClienteIn = { nombre: '', telefono: '', activo: true }

export function ClientesAdmin() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [form, setForm] = useState<ClienteIn>(VACIO)
  const [enviando, setEnviando] = useState(false)

  function cargarClientes(q = '') {
    api
      .get<Cliente[]>('/clientes', { params: q ? { q } : undefined })
      .then((res) => setClientes(res.data))
      .catch(() => notifications.show({ title: 'No se pudo cargar', message: 'No se pudieron cargar los clientes.', color: 'red' }))
  }

  useEffect(() => cargarClientes(), [])

  useEffect(() => {
    const timeout = setTimeout(() => cargarClientes(busqueda), 300)
    return () => clearTimeout(timeout)
  }, [busqueda])

  function abrirNuevo() {
    setEditando(null)
    setForm(VACIO)
    setModalAbierto(true)
  }

  function abrirEdicion(cliente: Cliente) {
    setEditando(cliente)
    setForm({ nombre: cliente.nombre, telefono: cliente.telefono ?? '', activo: cliente.activo })
    setModalAbierto(true)
  }

  async function guardar() {
    if (!form.nombre.trim()) return
    setEnviando(true)
    try {
      if (editando) {
        await api.put(`/clientes/${editando.id}`, form)
        notifications.show({ title: 'Cliente actualizado', message: form.nombre, color: 'teal' })
      } else {
        await api.post('/clientes', form)
        notifications.show({ title: 'Cliente creado', message: form.nombre, color: 'teal' })
      }
      setModalAbierto(false)
      cargarClientes(busqueda)
    } finally {
      setEnviando(false)
    }
  }

  function confirmarBaja(cliente: Cliente) {
    modals.openConfirmModal({
      title: 'Dar de baja cliente',
      children: <Text size="sm">'{cliente.nombre}' no va a aparecer más como sugerencia al registrar una consulta nueva.</Text>,
      labels: { confirm: 'Dar de baja', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await api.delete(`/clientes/${cliente.id}`)
        notifications.show({ title: 'Cliente dado de baja', message: cliente.nombre, color: 'red' })
        cargarClientes(busqueda)
      },
    })
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <Title order={4}>Clientes ({clientes.length})</Title>
        <Group>
          <TextInput
            placeholder="Buscar por nombre o teléfono"
            leftSection={<IconSearch size={16} />}
            value={busqueda}
            onChange={(e) => setBusqueda(e.currentTarget.value)}
          />
          <Button leftSection={<IconPlus size={16} />} onClick={abrirNuevo}>
            Nuevo cliente
          </Button>
        </Group>
      </Group>

      <Table striped highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nombre</Table.Th>
            <Table.Th>Teléfono</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th w={100} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {clientes.map((c) => (
            <Table.Tr key={c.id} opacity={c.activo ? 1 : 0.5}>
              <Table.Td>{c.nombre}</Table.Td>
              <Table.Td>{c.telefono ?? '—'}</Table.Td>
              <Table.Td>
                <Badge variant="light" color={c.activo ? 'teal' : 'gray'}>
                  {c.activo ? 'Activo' : 'De baja'}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap={4}>
                  <ActionIcon variant="subtle" onClick={() => abrirEdicion(c)} aria-label="Editar">
                    <IconEdit size={16} />
                  </ActionIcon>
                  {c.activo && (
                    <ActionIcon variant="subtle" color="red" onClick={() => confirmarBaja(c)} aria-label="Dar de baja">
                      <IconTrashX size={16} />
                    </ActionIcon>
                  )}
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={modalAbierto} onClose={() => setModalAbierto(false)} title={editando ? 'Editar cliente' : 'Nuevo cliente'}>
        <Stack gap="md">
          <TextInput label="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.currentTarget.value })} data-autofocus />
          <TextInput label="Teléfono" value={form.telefono ?? ''} onChange={(e) => setForm({ ...form, telefono: e.currentTarget.value })} />
          <Button onClick={guardar} loading={enviando}>
            Guardar
          </Button>
        </Stack>
      </Modal>
    </Stack>
  )
}
