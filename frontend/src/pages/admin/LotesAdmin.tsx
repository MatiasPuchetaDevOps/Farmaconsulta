import { ActionIcon, Badge, Button, Card, Group, Modal, NumberInput, Select, SimpleGrid, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconEdit, IconPlus, IconSearch, IconTrashX } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { Lote, LoteIn, LotesAlerta, Producto } from '../../types/api'

const VACIO: LoteIn = { producto_id: 0, numero_lote: '', vencimiento: '', cantidad: 0, activo: true }

function estadoLote(dias: number): { label: string; color: string } {
  if (dias < 0) return { label: 'Vencido', color: 'red' }
  if (dias <= 30) return { label: 'Por vencer', color: 'orange' }
  return { label: 'Vigente', color: 'teal' }
}

export function LotesAdmin() {
  const [lotes, setLotes] = useState<Lote[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [alertas, setAlertas] = useState<LotesAlerta | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Lote | null>(null)
  const [form, setForm] = useState<LoteIn>(VACIO)
  const [enviando, setEnviando] = useState(false)

  function cargarLotes() {
    api
      .get<Lote[]>('/lotes', { params: { solo_activos: true } })
      .then((res) => setLotes(res.data))
      .catch(() => notifications.show({ title: 'No se pudo cargar', message: 'No se pudieron cargar los lotes.', color: 'red' }))
  }

  function cargarAlertas() {
    api
      .get<LotesAlerta>('/lotes/alertas', { params: { dias: 30 } })
      .then((res) => setAlertas(res.data))
      .catch(() => notifications.show({ title: 'No se pudo cargar', message: 'No se pudieron cargar las alertas de vencimiento.', color: 'red' }))
  }

  function cargarProductos() {
    api
      .get<Producto[]>('/productos')
      .then((res) => setProductos(res.data.filter((p) => p.activo)))
      .catch(() => notifications.show({ title: 'No se pudo cargar', message: 'No se pudieron cargar los productos.', color: 'red' }))
  }

  useEffect(() => {
    cargarLotes()
    cargarAlertas()
    cargarProductos()
  }, [])

  function abrirNuevo() {
    setEditando(null)
    setForm(VACIO)
    setModalAbierto(true)
  }

  function abrirEdicion(lote: Lote) {
    setEditando(lote)
    setForm({ producto_id: lote.producto_id, numero_lote: lote.numero_lote, vencimiento: lote.vencimiento, cantidad: lote.cantidad, activo: lote.activo })
    setModalAbierto(true)
  }

  async function guardar() {
    if (!form.producto_id || !form.numero_lote.trim() || !form.vencimiento) return
    setEnviando(true)
    try {
      if (editando) {
        await api.put(`/lotes/${editando.id}`, form)
        notifications.show({ title: 'Lote actualizado', message: form.numero_lote, color: 'teal' })
      } else {
        await api.post('/lotes', form)
        notifications.show({ title: 'Lote creado', message: form.numero_lote, color: 'teal' })
      }
      setModalAbierto(false)
      cargarLotes()
      cargarAlertas()
    } catch (err: unknown) {
      const detalle = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notifications.show({ title: 'No se pudo guardar', message: detalle ?? 'Revisá los datos e intentá de nuevo.', color: 'red' })
    } finally {
      setEnviando(false)
    }
  }

  function confirmarBaja(lote: Lote) {
    modals.openConfirmModal({
      title: 'Dar de baja lote',
      children: (
        <Text size="sm">
          El lote '{lote.numero_lote}' de {lote.producto_nombre} dejará de aparecer en las alertas de vencimiento.
        </Text>
      ),
      labels: { confirm: 'Dar de baja', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await api.delete(`/lotes/${lote.id}`)
        notifications.show({ title: 'Lote dado de baja', message: lote.numero_lote, color: 'red' })
        cargarLotes()
        cargarAlertas()
      },
    })
  }

  const lotesFiltrados = lotes.filter((l) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return l.producto_nombre.toLowerCase().includes(q) || l.numero_lote.toLowerCase().includes(q)
  })

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, xs: 2 }}>
        <Card withBorder>
          <Text size="xs" c="dimmed">
            Lotes vencidos
          </Text>
          <Text fz={28} fw={700} c="red">
            {alertas?.vencidos.length ?? 0}
          </Text>
        </Card>
        <Card withBorder>
          <Text size="xs" c="dimmed">
            Por vencer (30 días)
          </Text>
          <Text fz={28} fw={700} c="orange">
            {alertas?.por_vencer.length ?? 0}
          </Text>
        </Card>
      </SimpleGrid>

      <Group justify="space-between" wrap="wrap">
        <Title order={4}>Lotes ({lotesFiltrados.length} de {lotes.length})</Title>
        <Group>
          <TextInput
            placeholder="Buscar por producto o número de lote"
            leftSection={<IconSearch size={16} />}
            value={busqueda}
            onChange={(e) => setBusqueda(e.currentTarget.value)}
          />
          <Button leftSection={<IconPlus size={16} />} onClick={abrirNuevo}>
            Nuevo lote
          </Button>
        </Group>
      </Group>

      <Table striped highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Producto</Table.Th>
            <Table.Th>Lote</Table.Th>
            <Table.Th>Vencimiento</Table.Th>
            <Table.Th>Cantidad</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th w={100} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {lotesFiltrados.map((l) => {
            const estado = estadoLote(l.dias_para_vencer)
            return (
              <Table.Tr key={l.id}>
                <Table.Td>{l.producto_nombre}</Table.Td>
                <Table.Td>{l.numero_lote}</Table.Td>
                <Table.Td>{l.vencimiento}</Table.Td>
                <Table.Td>{l.cantidad}</Table.Td>
                <Table.Td>
                  <Badge variant="light" color={estado.color}>
                    {estado.label}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <ActionIcon variant="subtle" onClick={() => abrirEdicion(l)} aria-label="Editar">
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => confirmarBaja(l)} aria-label="Dar de baja">
                      <IconTrashX size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>

      <Modal opened={modalAbierto} onClose={() => setModalAbierto(false)} title={editando ? 'Editar lote' : 'Nuevo lote'}>
        <Stack gap="md">
          <Select
            label="Producto"
            data={productos.map((p) => ({ value: String(p.id), label: p.producto_nombre }))}
            value={form.producto_id ? String(form.producto_id) : null}
            onChange={(v) => setForm({ ...form, producto_id: Number(v) || 0 })}
            searchable
            data-autofocus
          />
          <TextInput label="Número de lote" value={form.numero_lote} onChange={(e) => setForm({ ...form, numero_lote: e.currentTarget.value })} />
          <TextInput label="Vencimiento" type="date" value={form.vencimiento} onChange={(e) => setForm({ ...form, vencimiento: e.currentTarget.value })} />
          <NumberInput label="Cantidad" min={0} value={form.cantidad} onChange={(v) => setForm({ ...form, cantidad: Number(v) || 0 })} />
          <Button onClick={guardar} loading={enviando}>
            Guardar
          </Button>
        </Stack>
      </Modal>
    </Stack>
  )
}
