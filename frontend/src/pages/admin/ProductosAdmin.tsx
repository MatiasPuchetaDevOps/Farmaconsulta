import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconEdit, IconPlus, IconTrashX } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { Producto, ProductoIn } from '../../types/api'
import { formatoPesos } from '../../utils/formato'

const CATEGORIAS_POR_DEFECTO = ['Analgesicos', 'Antibioticos', 'Antialergicos', 'Dermatologicos', 'Vitaminas', 'Otros']

const VACIO: ProductoIn = {
  producto_nombre: '',
  categoria: CATEGORIAS_POR_DEFECTO[0],
  precio_lista: 0,
  stock_disponible: 0,
  droga_generica: '',
  requiere_receta: false,
  activo: true,
}

export function ProductosAdmin() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Producto | null>(null)
  const [form, setForm] = useState<ProductoIn>(VACIO)
  const [enviando, setEnviando] = useState(false)

  function cargarProductos() {
    api.get<Producto[]>('/productos').then((res) => setProductos(res.data))
  }

  useEffect(cargarProductos, [])

  function abrirNuevo() {
    setEditando(null)
    setForm(VACIO)
    setModalAbierto(true)
  }

  function abrirEdicion(producto: Producto) {
    setEditando(producto)
    setForm({
      producto_nombre: producto.producto_nombre,
      categoria: producto.categoria,
      precio_lista: producto.precio_lista,
      stock_disponible: producto.stock_disponible,
      droga_generica: producto.droga_generica ?? '',
      requiere_receta: producto.requiere_receta,
      activo: producto.activo,
    })
    setModalAbierto(true)
  }

  async function guardar() {
    if (!form.producto_nombre.trim()) return
    setEnviando(true)
    try {
      const payload = { ...form, droga_generica: form.droga_generica?.trim() || null }
      if (editando) {
        await api.put(`/productos/${editando.id}`, payload)
        notifications.show({ title: 'Producto actualizado', message: form.producto_nombre, color: 'teal' })
      } else {
        await api.post('/productos', payload)
        notifications.show({ title: 'Producto creado', message: form.producto_nombre, color: 'teal' })
      }
      setModalAbierto(false)
      cargarProductos()
    } catch (err: unknown) {
      const detalle = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notifications.show({ title: 'No se pudo guardar', message: detalle ?? 'Revisá los datos e intentá de nuevo.', color: 'red' })
    } finally {
      setEnviando(false)
    }
  }

  function confirmarBaja(producto: Producto) {
    modals.openConfirmModal({
      title: 'Dar de baja producto',
      children: (
        <Text size="sm">
          '{producto.producto_nombre}' dejará de aparecer en la consulta de precio. El historial de consultas ya registradas no se ve afectado.
        </Text>
      ),
      labels: { confirm: 'Dar de baja', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await api.delete(`/productos/${producto.id}`)
        notifications.show({ title: 'Producto dado de baja', message: producto.producto_nombre, color: 'red' })
        cargarProductos()
      },
    })
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={4}>Productos ({productos.length})</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={abrirNuevo}>
          Nuevo producto
        </Button>
      </Group>

      <Table striped highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Producto</Table.Th>
            <Table.Th>Categoría</Table.Th>
            <Table.Th>Precio de lista</Table.Th>
            <Table.Th>Stock</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th w={100} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {productos.map((p) => (
            <Table.Tr key={p.id} opacity={p.activo ? 1 : 0.5}>
              <Table.Td>{p.producto_nombre}</Table.Td>
              <Table.Td>{p.categoria}</Table.Td>
              <Table.Td>{formatoPesos(p.precio_lista)}</Table.Td>
              <Table.Td>{p.stock_disponible}</Table.Td>
              <Table.Td>
                <Badge variant="light" color={p.activo ? 'teal' : 'gray'}>
                  {p.activo ? 'Activo' : 'De baja'}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap={4}>
                  <ActionIcon variant="subtle" onClick={() => abrirEdicion(p)} aria-label="Editar">
                    <IconEdit size={16} />
                  </ActionIcon>
                  {p.activo && (
                    <ActionIcon variant="subtle" color="red" onClick={() => confirmarBaja(p)} aria-label="Dar de baja">
                      <IconTrashX size={16} />
                    </ActionIcon>
                  )}
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={modalAbierto} onClose={() => setModalAbierto(false)} title={editando ? 'Editar producto' : 'Nuevo producto'}>
        <Stack gap="md">
          <TextInput
            label="Nombre del producto"
            value={form.producto_nombre}
            onChange={(e) => setForm({ ...form, producto_nombre: e.currentTarget.value })}
            data-autofocus
          />
          <Select
            label="Categoría"
            data={CATEGORIAS_POR_DEFECTO}
            value={form.categoria}
            onChange={(v) => setForm({ ...form, categoria: v ?? CATEGORIAS_POR_DEFECTO[0] })}
          />
          <Group grow>
            <NumberInput
              label="Precio de lista"
              min={0}
              step={100}
              value={form.precio_lista}
              onChange={(v) => setForm({ ...form, precio_lista: Number(v) || 0 })}
            />
            <NumberInput
              label="Stock disponible"
              min={0}
              step={1}
              value={form.stock_disponible}
              onChange={(v) => setForm({ ...form, stock_disponible: Number(v) || 0 })}
            />
          </Group>
          <TextInput
            label="Droga genérica (opcional)"
            value={form.droga_generica ?? ''}
            onChange={(e) => setForm({ ...form, droga_generica: e.currentTarget.value })}
          />
          <Checkbox
            label="Requiere receta"
            checked={form.requiere_receta}
            onChange={(e) => setForm({ ...form, requiere_receta: e.currentTarget.checked })}
          />
          {editando && (
            <Checkbox label="Activo (visible en la consulta de precio)" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.currentTarget.checked })} />
          )}
          <Button onClick={guardar} loading={enviando}>
            Guardar
          </Button>
        </Stack>
      </Modal>
    </Stack>
  )
}
