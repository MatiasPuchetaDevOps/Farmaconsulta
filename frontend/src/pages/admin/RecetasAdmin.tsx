import { ActionIcon, Autocomplete, Badge, Button, Card, Group, Modal, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCheck, IconPlus, IconX } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { Cliente, Producto, Receta, RecetaIn } from '../../types/api'

const VACIO: RecetaIn = { cliente_nombre: '', cliente_tel: '', producto_id: 0, medico_nombre: '', medico_matricula: '', fecha_emision: new Date().toISOString().slice(0, 10) }

export function RecetasAdmin() {
  const [pendientes, setPendientes] = useState<Receta[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [form, setForm] = useState<RecetaIn>(VACIO)
  const [enviando, setEnviando] = useState(false)

  const [modalRechazo, setModalRechazo] = useState<Receta | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [procesando, setProcesando] = useState(false)

  function cargarPendientes() {
    api
      .get<Receta[]>('/recetas', { params: { estado: 'pendiente' } })
      .then((res) => setPendientes(res.data))
      .catch(() => notifications.show({ title: 'No se pudo cargar', message: 'No se pudieron cargar las recetas pendientes.', color: 'red' }))
  }

  useEffect(() => {
    cargarPendientes()
    api.get<Cliente[]>('/clientes').then((res) => setClientes(res.data)).catch(() => {})
    api
      .get<Producto[]>('/productos')
      .then((res) => setProductos(res.data.filter((p) => p.activo && p.requiere_receta)))
      .catch(() => {})
  }, [])

  function elegirCliente(nombre: string) {
    const encontrado = clientes.find((c) => c.nombre === nombre)
    setForm({ ...form, cliente_nombre: nombre, cliente_tel: encontrado?.telefono ?? form.cliente_tel })
  }

  async function recibirReceta() {
    if (!form.cliente_nombre.trim() || !form.producto_id || !form.fecha_emision) return
    setEnviando(true)
    try {
      await api.post('/recetas', form)
      notifications.show({ title: 'Receta recibida', message: `Queda pendiente de validación`, color: 'teal' })
      setForm({ ...VACIO, fecha_emision: form.fecha_emision })
      cargarPendientes()
    } catch (err: unknown) {
      const detalle = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notifications.show({ title: 'No se pudo recibir la receta', message: detalle ?? 'Revisá los datos e intentá de nuevo.', color: 'red' })
    } finally {
      setEnviando(false)
    }
  }

  async function validar(receta: Receta) {
    try {
      await api.post(`/recetas/${receta.id}/validar`, { estado: 'validada' })
      notifications.show({ title: 'Receta validada', message: `${receta.cliente_nombre} · ${receta.producto_nombre}`, color: 'teal' })
      cargarPendientes()
    } catch (err: unknown) {
      const detalle = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notifications.show({ title: 'No se pudo validar', message: detalle ?? 'Intentá de nuevo.', color: 'red' })
    }
  }

  function abrirRechazo(receta: Receta) {
    setModalRechazo(receta)
    setMotivoRechazo('')
  }

  async function confirmarRechazo() {
    if (!modalRechazo || !motivoRechazo.trim()) return
    setProcesando(true)
    try {
      await api.post(`/recetas/${modalRechazo.id}/validar`, { estado: 'rechazada', observaciones: motivoRechazo.trim() })
      notifications.show({ title: 'Receta rechazada', message: `${modalRechazo.cliente_nombre} · ${modalRechazo.producto_nombre}`, color: 'red' })
      setModalRechazo(null)
      cargarPendientes()
    } catch (err: unknown) {
      const detalle = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notifications.show({ title: 'No se pudo rechazar', message: detalle ?? 'Intentá de nuevo.', color: 'red' })
    } finally {
      setProcesando(false)
    }
  }

  return (
    <Stack gap="lg">
      <Card>
        <Title order={4} mb="md">
          Recetas pendientes ({pendientes.length})
        </Title>
        <Table striped highlightOnHover verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Cliente</Table.Th>
              <Table.Th>Producto</Table.Th>
              <Table.Th>Médico</Table.Th>
              <Table.Th>Emisión</Table.Th>
              <Table.Th w={100} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pendientes.map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td>{r.cliente_nombre}</Table.Td>
                <Table.Td>{r.producto_nombre}</Table.Td>
                <Table.Td>
                  {r.medico_nombre ?? '—'} {r.medico_matricula ? `(MP ${r.medico_matricula})` : ''}
                </Table.Td>
                <Table.Td>{r.fecha_emision}</Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <ActionIcon variant="subtle" color="teal" onClick={() => validar(r)} aria-label="Validar">
                      <IconCheck size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => abrirRechazo(r)} aria-label="Rechazar">
                      <IconX size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {pendientes.length === 0 && (
          <Text size="sm" c="dimmed" mt="sm">
            No hay recetas pendientes de validación.
          </Text>
        )}
      </Card>

      <Card maw={480}>
        <Title order={4} mb="md">
          Recibir receta
        </Title>
        <Stack gap="md">
          <Autocomplete
            label="Cliente"
            description="Elegí uno existente o escribí uno nuevo"
            data={Array.from(new Set(clientes.map((c) => c.nombre)))}
            value={form.cliente_nombre}
            onChange={elegirCliente}
          />
          <TextInput label="Teléfono del cliente" value={form.cliente_tel} onChange={(e) => setForm({ ...form, cliente_tel: e.currentTarget.value })} />
          <Select
            label="Producto"
            description="Solo se listan productos que requieren receta"
            data={productos.map((p) => ({ value: String(p.id), label: p.producto_nombre }))}
            value={form.producto_id ? String(form.producto_id) : null}
            onChange={(v) => setForm({ ...form, producto_id: Number(v) || 0 })}
            searchable
          />
          <TextInput label="Médico (opcional)" value={form.medico_nombre ?? ''} onChange={(e) => setForm({ ...form, medico_nombre: e.currentTarget.value })} />
          <TextInput label="Matrícula (opcional)" value={form.medico_matricula ?? ''} onChange={(e) => setForm({ ...form, medico_matricula: e.currentTarget.value })} />
          <TextInput label="Fecha de emisión" type="date" value={form.fecha_emision} onChange={(e) => setForm({ ...form, fecha_emision: e.currentTarget.value })} />
          <Button leftSection={<IconPlus size={16} />} onClick={recibirReceta} loading={enviando}>
            Recibir receta
          </Button>
        </Stack>
      </Card>

      <Modal opened={!!modalRechazo} onClose={() => setModalRechazo(null)} title="Rechazar receta">
        <Stack gap="md">
          <Text size="sm">
            {modalRechazo?.cliente_nombre} · {modalRechazo?.producto_nombre}
          </Text>
          <TextInput label="Motivo del rechazo" value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.currentTarget.value)} data-autofocus />
          <Badge color={motivoRechazo.trim() ? 'teal' : 'gray'} variant="light" w="fit-content">
            {motivoRechazo.trim() ? 'Listo para rechazar' : 'El motivo es obligatorio'}
          </Badge>
          <Button color="red" onClick={confirmarRechazo} loading={procesando} disabled={!motivoRechazo.trim()}>
            Confirmar rechazo
          </Button>
        </Stack>
      </Modal>
    </Stack>
  )
}
