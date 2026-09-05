import {
  Alert,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { IconAlertTriangle, IconCircleCheck, IconCoin, IconSearch } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Desglose, MedioPago, Producto, StockInfo } from '../types/api'
import { formatoPesos, formatoPorcentaje } from '../utils/formato'

export function ConsultaPrecio() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [obrasSociales, setObrasSociales] = useState<string[]>([])
  const [metodosPago, setMetodosPago] = useState<string[]>([])

  const [producto, setProducto] = useState<string | null>(null)
  const [obraSocial, setObraSocial] = useState<string | null>(null)
  const [metodoPago, setMetodoPago] = useState<string | null>(null)

  const [desglose, setDesglose] = useState<Desglose | null>(null)
  const [comparacion, setComparacion] = useState<MedioPago[]>([])
  const [stock, setStock] = useState<StockInfo | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get<Producto[]>('/catalogos/productos'),
      api.get<string[]>('/catalogos/obras-sociales'),
      api.get<string[]>('/catalogos/metodos-pago'),
    ]).then(([resProductos, resObras, resMetodos]) => {
      setProductos(resProductos.data)
      setObrasSociales(resObras.data)
      setMetodosPago(resMetodos.data)
      if (resProductos.data.length) setProducto(resProductos.data[0].producto_nombre)
      if (resObras.data.length) setObraSocial(resObras.data[0])
      if (resMetodos.data.length) setMetodoPago(resMetodos.data[0])
    })
  }, [])

  async function calcular() {
    if (!producto || !obraSocial || !metodoPago) return
    setCargando(true)
    setError(null)
    try {
      const [resDesglose, resComparacion, resStock] = await Promise.all([
        api.post<Desglose>('/calculadora/calcular', { producto_nombre: producto, obra_social: obraSocial, metodo_pago: metodoPago }),
        api.post<MedioPago[]>('/calculadora/comparar-medios-pago', { producto_nombre: producto, obra_social: obraSocial }),
        api.get<StockInfo>(`/stock/${encodeURIComponent(producto)}`),
      ])
      setDesglose(resDesglose.data)
      setComparacion(resComparacion.data)
      setStock(resStock.data)
    } catch {
      setError('No se pudo calcular el precio. Probá de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <Grid>
      <Grid.Col span={{ base: 12, md: 4 }}>
        <Card>
          <Title order={4} mb="md">
            Consulta de precio
          </Title>
          <Stack gap="sm">
            <Select
              label="Producto"
              data={productos.map((p) => p.producto_nombre)}
              value={producto}
              onChange={setProducto}
              searchable
            />
            <Select label="Obra social" data={obrasSociales} value={obraSocial} onChange={setObraSocial} searchable />
            <Select label="Método de pago" data={metodosPago} value={metodoPago} onChange={setMetodoPago} />
            <Button onClick={calcular} loading={cargando} leftSection={<IconSearch size={16} />} mt="xs">
              Calcular precio
            </Button>
            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}
          </Stack>
        </Card>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 8 }}>
        {desglose && (
          <Stack gap="lg">
            <Card>
              <Title order={4} mb="md">
                Ticket de consulta: {desglose.producto_nombre}
              </Title>
              <SimpleGrid cols={{ base: 1, xs: 3 }} mb="md">
                <div>
                  <Text size="xs" c="dimmed">
                    Precio de lista
                  </Text>
                  <Text fz={22} fw={700}>
                    {formatoPesos(desglose.precio_lista)}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    Descuento aplicado
                  </Text>
                  <Text fz={22} fw={700}>
                    {formatoPorcentaje(desglose.descuento_total_pct / 100)}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    PRECIO FINAL
                  </Text>
                  <Text fz={22} fw={700} c="blue">
                    {formatoPesos(desglose.precio_final)}
                  </Text>
                  <Text size="xs" c="teal">
                    -{formatoPesos(desglose.ahorro_total)}
                  </Text>
                </div>
              </SimpleGrid>
              <Card withBorder={false} bg="var(--mantine-color-gray-0)" radius="md">
                <Text className="desglose-texto">
                  {`Precio de lista: ${formatoPesos(desglose.precio_lista)}\n\n` +
                    `- Descuento obra social ${desglose.obra_social} (${formatoPorcentaje(desglose.descuento_os)}): ` +
                    `-${formatoPesos(desglose.precio_lista - desglose.precio_tras_os)}   ->   ${formatoPesos(desglose.precio_tras_os)}\n` +
                    `- Descuento banco ${desglose.metodo_pago} (${formatoPorcentaje(desglose.descuento_banco)}): ` +
                    `-${formatoPesos(desglose.precio_tras_os - desglose.precio_final)}   ->   ${formatoPesos(desglose.precio_final)}\n\n` +
                    `TOTAL A ABONAR: ${formatoPesos(desglose.precio_final)}   (ahorro total: ${formatoPesos(desglose.ahorro_total)})`}
                </Text>
              </Card>
            </Card>

            <Card>
              <Title order={4} mb="md">
                Comparación de medios de pago
              </Title>
              {comparacion.length > 0 && (
                <Alert color="teal" icon={<IconCoin size={16} />} variant="light" mb="md">
                  La mejor opción es pagar con <strong>{comparacion[0].metodo_pago}</strong>: {formatoPesos(comparacion[0].precio_final)}{' '}
                  (ahorro de {formatoPesos(comparacion[0].ahorro)} respecto de pagar sin promoción bancaria).
                </Alert>
              )}
              <Table striped highlightOnHover verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Método de pago</Table.Th>
                    <Table.Th>Descuento banco</Table.Th>
                    <Table.Th>Precio final</Table.Th>
                    <Table.Th>Ahorro</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {comparacion.map((fila, i) => (
                    <Table.Tr key={fila.metodo_pago}>
                      <Table.Td>
                        <Group gap={6}>
                          {fila.metodo_pago}
                          {i === 0 && (
                            <Badge size="xs" color="teal">
                              Mejor opción
                            </Badge>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>{formatoPorcentaje(fila.descuento_banco)}</Table.Td>
                      <Table.Td>{formatoPesos(fila.precio_final)}</Table.Td>
                      <Table.Td>{formatoPesos(fila.ahorro)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>

            {stock && (
              <Card>
                <Title order={4} mb="md">
                  Stock disponible
                </Title>
                {stock.alerta ? (
                  <Alert color="orange" icon={<IconAlertTriangle size={16} />} variant="light">
                    Stock bajo: quedan {stock.stock_actual} unidades de '{stock.producto_nombre}' (umbral: {stock.umbral}).
                  </Alert>
                ) : (
                  <Alert color="teal" icon={<IconCircleCheck size={16} />} variant="light">
                    Stock disponible: {stock.stock_actual} unidades. No hay alerta de stock.
                  </Alert>
                )}
                {stock.alerta && stock.alternativas.length > 0 && (
                  <>
                    <Text size="sm" mt="md" mb={4}>
                      Alternativas sugeridas:
                    </Text>
                    <Table striped verticalSpacing="xs">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Producto</Table.Th>
                          <Table.Th>Stock disponible</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {stock.alternativas.map((alt) => (
                          <Table.Tr key={alt.producto_nombre}>
                            <Table.Td>{alt.producto_nombre}</Table.Td>
                            <Table.Td>{alt.stock_disponible}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </>
                )}
                {stock.alerta && stock.alternativas.length === 0 && (
                  <Text size="sm" mt="md" c="dimmed">
                    No se encontraron alternativas con stock suficiente en la misma categoría.
                  </Text>
                )}
              </Card>
            )}
          </Stack>
        )}
      </Grid.Col>
    </Grid>
  )
}
