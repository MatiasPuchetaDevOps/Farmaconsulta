import { ActionIcon, Badge, Button, Group, Modal, Slider, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconEdit, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { BancoPromocion } from '../../types/api'
import { formatoPorcentaje } from '../../utils/formato'

export function BancosPromocionesAdmin() {
  const [promociones, setPromociones] = useState<BancoPromocion[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<BancoPromocion | null>(null)
  const [banco, setBanco] = useState('')
  const [descuentoPct, setDescuentoPct] = useState(10)
  const [enviando, setEnviando] = useState(false)

  function cargarPromociones() {
    api
      .get<BancoPromocion[]>('/bancos-promociones')
      .then((res) => setPromociones(res.data))
      .catch(() => notifications.show({ title: 'No se pudo cargar', message: 'No se pudieron cargar las promociones bancarias.', color: 'red' }))
  }

  useEffect(cargarPromociones, [])

  function abrirNuevo() {
    setEditando(null)
    setBanco('')
    setDescuentoPct(10)
    setModalAbierto(true)
  }

  function abrirEdicion(promocion: BancoPromocion) {
    setEditando(promocion)
    setBanco(promocion.banco)
    setDescuentoPct(Math.round(promocion.descuento_banco * 100))
    setModalAbierto(true)
  }

  async function guardar() {
    if (!banco.trim()) return
    setEnviando(true)
    try {
      await api.post('/bancos-promociones', { banco, descuento_pct: descuentoPct })
      notifications.show({ title: editando ? 'Promoción actualizada' : 'Promoción cargada', message: `'${banco}' quedó con ${descuentoPct}% de descuento.`, color: 'teal' })
      setModalAbierto(false)
      cargarPromociones()
    } finally {
      setEnviando(false)
    }
  }

  function confirmarEliminar(promocion: BancoPromocion) {
    modals.openConfirmModal({
      title: 'Eliminar promoción bancaria',
      children: <Text size="sm">¿Eliminar la promoción de '{promocion.banco}'? Las consultas y ventas ya registradas con este descuento no se ven afectadas.</Text>,
      labels: { confirm: 'Eliminar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await api.delete(`/bancos-promociones/${promocion.id}`)
        notifications.show({ title: 'Promoción eliminada', message: `'${promocion.banco}' se eliminó.`, color: 'red' })
        cargarPromociones()
      },
    })
  }

  const promocionesFiltradas = promociones.filter((p) => p.banco.toLowerCase().includes(busqueda.trim().toLowerCase()))

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <Title order={4}>Bancos / promociones ({promocionesFiltradas.length} de {promociones.length})</Title>
        <Group>
          <TextInput
            placeholder="Buscar banco"
            leftSection={<IconSearch size={16} />}
            value={busqueda}
            onChange={(e) => setBusqueda(e.currentTarget.value)}
          />
          <Button leftSection={<IconPlus size={16} />} onClick={abrirNuevo}>
            Nueva promoción
          </Button>
        </Group>
      </Group>

      <Table striped highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Banco</Table.Th>
            <Table.Th>Descuento</Table.Th>
            <Table.Th w={100} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {promocionesFiltradas.map((p) => (
            <Table.Tr key={p.id}>
              <Table.Td>{p.banco}</Table.Td>
              <Table.Td>
                <Badge variant="light" color="blue">
                  {formatoPorcentaje(p.descuento_banco)}
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

      <Modal opened={modalAbierto} onClose={() => setModalAbierto(false)} title={editando ? 'Editar promoción' : 'Nueva promoción'}>
        <Stack gap="md">
          {editando ? (
            <TextInput label="Banco" value={banco} disabled description="El nombre no se puede cambiar; si cambió de nombre, cargá una promoción nueva." />
          ) : (
            <TextInput label="Nombre del banco" value={banco} onChange={(e) => setBanco(e.currentTarget.value)} data-autofocus />
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
