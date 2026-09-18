import { Alert, Badge, Button, Card, Group, NumberInput, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconRefresh, IconSearch } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { AjustePrecioHistorial, AjustePrecioPreview, Producto } from '../../types/api'
import { formatoPesos } from '../../utils/formato'

export function AjustePreciosAdmin() {
  const [categorias, setCategorias] = useState<string[]>([])
  const [categoria, setCategoria] = useState<string | null>(null)
  const [pct, setPct] = useState(10)
  const [generando, setGenerando] = useState(false)
  const [preview, setPreview] = useState<AjustePrecioPreview | null>(null)
  const [aplicando, setAplicando] = useState(false)
  const [historial, setHistorial] = useState<AjustePrecioHistorial[]>([])
  const [busquedaPreview, setBusquedaPreview] = useState('')
  const [busquedaHistorial, setBusquedaHistorial] = useState('')

  function cargarHistorial() {
    api
      .get<AjustePrecioHistorial[]>('/ajuste-precios/historial')
      .then((res) => setHistorial(res.data))
      .catch(() => notifications.show({ title: 'No se pudo cargar', message: 'No se pudo cargar el historial.', color: 'red' }))
  }

  useEffect(() => {
    api
      .get<Producto[]>('/productos')
      .then((res) => setCategorias(Array.from(new Set(res.data.map((p) => p.categoria)))))
      .catch(() => {})
    cargarHistorial()
  }, [])

  async function generarPreview() {
    setGenerando(true)
    setPreview(null)
    try {
      const res = await api.post<AjustePrecioPreview>('/ajuste-precios/preview', { pct, categoria })
      setPreview(res.data)
    } catch {
      notifications.show({ title: 'No se pudo generar', message: 'Intentá de nuevo.', color: 'red' })
    } finally {
      setGenerando(false)
    }
  }

  function confirmarAplicar() {
    if (!preview) return
    modals.openConfirmModal({
      title: 'Aplicar ajuste de precios',
      children: (
        <Text size="sm">
          Se van a actualizar {preview.propuesta.length} producto(s) con un ajuste del {preview.variacion_pct >= 0 ? '+' : ''}
          {preview.variacion_pct}%. Esta acción no se puede deshacer.
        </Text>
      ),
      labels: { confirm: 'Aplicar cambios', cancel: 'Cancelar' },
      confirmProps: { color: 'blue' },
      onConfirm: aplicar,
    })
  }

  async function aplicar() {
    if (!preview) return
    setAplicando(true)
    try {
      const res = await api.post(`/ajuste-precios/${preview.id}/confirmar`)
      const omitidos = res.data.items.filter((i: { omitido: boolean }) => i.omitido).length
      notifications.show({
        title: 'Precios ajustados',
        message: omitidos > 0 ? `${omitidos} producto(s) se omitieron porque cambiaron mientras tanto.` : 'Todos los productos se actualizaron.',
        color: 'teal',
      })
      setPreview(null)
      cargarHistorial()
    } catch (err: unknown) {
      const detalle = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notifications.show({ title: 'No se pudo aplicar', message: detalle ?? 'Intentá de nuevo.', color: 'red' })
    } finally {
      setAplicando(false)
    }
  }

  const propuestaFiltrada = (preview?.propuesta ?? []).filter((p) => p.producto_nombre.toLowerCase().includes(busquedaPreview.toLowerCase()))
  const historialFiltrado = historial.filter((h) => `${h.variacion_pct}`.includes(busquedaHistorial.trim()))

  return (
    <Stack gap="lg">
      <Card>
        <Title order={4} mb="md">
          Ajuste de precios
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Elegí un porcentaje de ajuste y generá una vista previa antes de aplicar ningún cambio.
        </Text>
        <Group align="flex-end">
          <NumberInput
            label="Porcentaje de ajuste (%)"
            description="Negativo para bajar precios"
            value={pct}
            onChange={(v) => setPct(Number(v) || 0)}
            w={200}
          />
          <Select label="Categoría (opcional)" data={categorias} value={categoria} onChange={setCategoria} clearable w={200} />
          <Button leftSection={<IconRefresh size={16} />} onClick={generarPreview} loading={generando}>
            Generar vista previa
          </Button>
        </Group>
      </Card>

      {preview && (
        <Card>
          <Group justify="space-between" mb="md" wrap="wrap">
            <Title order={4}>Vista previa ({propuestaFiltrada.length} de {preview.propuesta.length} productos)</Title>
            <Group>
              <TextInput
                placeholder="Buscar producto"
                leftSection={<IconSearch size={16} />}
                value={busquedaPreview}
                onChange={(e) => setBusquedaPreview(e.currentTarget.value)}
              />
              <Button onClick={confirmarAplicar} loading={aplicando}>
                Aplicar cambios
              </Button>
            </Group>
          </Group>
          {preview.aplicada && (
            <Alert color="gray" mb="md">
              Esta vista previa ya fue aplicada.
            </Alert>
          )}
          <Table striped highlightOnHover verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Producto</Table.Th>
                <Table.Th>Precio anterior</Table.Th>
                <Table.Th>Variación</Table.Th>
                <Table.Th>Precio nuevo</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {propuestaFiltrada.map((p) => (
                <Table.Tr key={p.producto_id}>
                  <Table.Td>{p.producto_nombre}</Table.Td>
                  <Table.Td>{formatoPesos(p.precio_anterior)}</Table.Td>
                  <Table.Td c={p.variacion_pct >= 0 ? 'teal' : 'red'}>
                    {p.variacion_pct >= 0 ? '+' : ''}
                    {p.variacion_pct}%
                  </Table.Td>
                  <Table.Td fw={600}>{formatoPesos(p.precio_nuevo)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      <Card>
        <Group justify="space-between" mb="md" wrap="wrap">
          <Title order={4}>Historial de ajustes</Title>
          <TextInput
            placeholder="Buscar por porcentaje"
            leftSection={<IconSearch size={16} />}
            value={busquedaHistorial}
            onChange={(e) => setBusquedaHistorial(e.currentTarget.value)}
          />
        </Group>
        <Table striped highlightOnHover verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Fecha</Table.Th>
              <Table.Th>Productos actualizados</Table.Th>
              <Table.Th>Porcentaje aplicado</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {historialFiltrado.map((h) => (
              <Table.Tr key={h.id}>
                <Table.Td>{new Date(h.aplicada_en).toLocaleString('es-AR')}</Table.Td>
                <Table.Td>
                  <Badge variant="light">{h.cantidad_productos}</Badge>
                </Table.Td>
                <Table.Td c={h.variacion_pct >= 0 ? 'teal' : 'red'}>
                  {h.variacion_pct >= 0 ? '+' : ''}
                  {h.variacion_pct}%
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  )
}
