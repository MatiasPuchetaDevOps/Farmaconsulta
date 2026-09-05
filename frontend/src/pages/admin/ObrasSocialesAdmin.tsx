import { ActionIcon, Badge, Button, Group, Modal, Slider, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { Plan } from '../../types/api'
import { formatoPorcentaje } from '../../utils/formato'

export function ObrasSocialesAdmin() {
  const [planes, setPlanes] = useState<Plan[]>([])
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Plan | null>(null)
  const [nombre, setNombre] = useState('')
  const [descuentoPct, setDescuentoPct] = useState(40)
  const [enviando, setEnviando] = useState(false)

  function cargarPlanes() {
    api.get<Plan[]>('/planes').then((res) => setPlanes(res.data))
  }

  useEffect(cargarPlanes, [])

  function abrirNuevo() {
    setEditando(null)
    setNombre('')
    setDescuentoPct(40)
    setModalAbierto(true)
  }

  function abrirEdicion(plan: Plan) {
    setEditando(plan)
    setNombre(plan.obra_social)
    setDescuentoPct(Math.round(plan.descuento_os * 100))
    setModalAbierto(true)
  }

  async function guardar() {
    if (!nombre.trim()) return
    setEnviando(true)
    try {
      await api.post('/planes', { obra_social: nombre, descuento_pct: descuentoPct })
      notifications.show({ title: editando ? 'Plan actualizado' : 'Plan cargado', message: `'${nombre}' quedó con ${descuentoPct}% de descuento.`, color: 'teal' })
      setModalAbierto(false)
      cargarPlanes()
    } finally {
      setEnviando(false)
    }
  }

  function confirmarEliminar(plan: Plan) {
    modals.openConfirmModal({
      title: 'Eliminar plan',
      children: <Text size="sm">¿Eliminar el plan de '{plan.obra_social}'? Las consultas ya registradas con este descuento no se ven afectadas.</Text>,
      labels: { confirm: 'Eliminar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await api.delete(`/planes/${plan.id}`)
        notifications.show({ title: 'Plan eliminado', message: `'${plan.obra_social}' se eliminó.`, color: 'red' })
        cargarPlanes()
      },
    })
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={4}>Obras sociales / planes ({planes.length})</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={abrirNuevo}>
          Nuevo plan
        </Button>
      </Group>

      <Table striped highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Obra social</Table.Th>
            <Table.Th>Descuento</Table.Th>
            <Table.Th w={100} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {planes.map((p) => (
            <Table.Tr key={p.id}>
              <Table.Td>{p.obra_social}</Table.Td>
              <Table.Td>
                <Badge variant="light" color="blue">
                  {formatoPorcentaje(p.descuento_os)}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap={4}>
                  <ActionIcon variant="subtle" onClick={() => abrirEdicion(p)} aria-label="Editar">
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red" onClick={() => confirmarEliminar(p)} aria-label="Eliminar">
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={modalAbierto} onClose={() => setModalAbierto(false)} title={editando ? 'Editar plan' : 'Nuevo plan'}>
        <Stack gap="md">
          {editando ? (
            <TextInput label="Obra social" value={nombre} disabled description="El nombre no se puede cambiar; si cambió de nombre, cargá un plan nuevo." />
          ) : (
            <TextInput label="Nombre de la obra social o plan" value={nombre} onChange={(e) => setNombre(e.currentTarget.value)} data-autofocus />
          )}
          <div>
            <Text size="sm" mb={4}>
              Descuento: <strong>{descuentoPct}%</strong>
            </Text>
            <Slider value={descuentoPct} onChange={setDescuentoPct} min={0} max={100} step={5} marks={[{ value: 0 }, { value: 50 }, { value: 100 }]} />
          </div>
          <Button onClick={guardar} loading={enviando}>
            Guardar
          </Button>
        </Stack>
      </Modal>
    </Stack>
  )
}
