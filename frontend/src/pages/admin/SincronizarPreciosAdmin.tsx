import { Alert, Badge, Button, Card, Group, NumberInput, Select, Stack, Table, Text, Title } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconRefresh } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { Producto, SincronizacionHistorial, SincronizacionPreview } from '../../types/api'
import { formatoPesos } from '../../utils/formato'

export function SincronizarPreciosAdmin() {
  const [categorias, setCategorias] = useState<string[]>([])
  const [categoria, setCategoria] = useState<string | null>(null)
  const [pctMin, setPctMin] = useState(-5)
  const [pctMax, setPctMax] = useState(10)
  const [generando, setGenerando] = useState(false)
  const [preview, setPreview] = useState<SincronizacionPreview | null>(null)
  const [aplicando, setAplicando] = useState(false)
  const [historial, setHistorial] = useState<SincronizacionHistorial[]>([])

  function cargarHistorial() {
    api
      .get<SincronizacionHistorial[]>('/sincronizacion-precios/historial')
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
      const res = await api.post<SincronizacionPreview>('/sincronizacion-precios/preview', { pct_min: pctMin, pct_max: pctMax, categoria })
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
      title: 'Aplicar sincronización de precios',
      children: (
        <Text size="sm">
          Se van a actualizar {preview.propuesta.length} producto(s) con la variación simulada. Esta acción no se puede deshacer.
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
      const res = await api.post(`/sincronizacion-precios/${preview.id}/confirmar`)
      const omitidos = res.data.items.filter((i: { omitido: boolean }) => i.omitido).length
      notifications.show({
        title: 'Precios sincronizados',
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

  return (
    <Stack gap="lg">
      <Card>
        <Title order={4} mb="md">
          Sincronizar precios (simulado, tipo droguería)
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Genera una vista previa con una variación aleatoria de precios antes de aplicar ningún cambio.
        </Text>
        <Group align="flex-end">
          <NumberInput label="Variación mínima (%)" value={pctMin} onChange={(v) => setPctMin(Number(v) || 0)} w={160} />
          <NumberInput label="Variación máxima (%)" value={pctMax} onChange={(v) => setPctMax(Number(v) || 0)} w={160} />
          <Select label="Categoría (opcional)" data={categorias} value={categoria} onChange={setCategoria} clearable w={200} />
          <Button leftSection={<IconRefresh size={16} />} onClick={generarPreview} loading={generando}>
            Generar vista previa
          </Button>
        </Group>
      </Card>

      {preview && (
        <Card>
          <Group justify="space-between" mb="md">
            <Title order={4}>Vista previa ({preview.propuesta.length} productos)</Title>
            <Button onClick={confirmarAplicar} loading={aplicando}>
              Aplicar cambios
            </Button>
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
              {preview.propuesta.map((p) => (
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
        <Title order={4} mb="md">
          Historial de sincronizaciones
        </Title>
        <Table striped highlightOnHover verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Fecha</Table.Th>
              <Table.Th>Productos actualizados</Table.Th>
              <Table.Th>Rango de variación</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {historial.map((h) => (
              <Table.Tr key={h.id}>
                <Table.Td>{new Date(h.aplicada_en).toLocaleString('es-AR')}</Table.Td>
                <Table.Td>
                  <Badge variant="light">{h.cantidad_productos}</Badge>
                </Table.Td>
                <Table.Td>
                  {h.variacion_pct_min}% a {h.variacion_pct_max}%
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  )
}
