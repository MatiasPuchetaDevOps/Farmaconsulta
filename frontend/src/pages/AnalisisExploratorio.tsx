import { Alert, Card, Center, Group, Loader, SimpleGrid, Stack, Table, Text, ThemeIcon, Title } from '@mantine/core'
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCoin,
  IconReceipt,
  IconReportMoney,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { BarChartGenerico } from '../components/graficos/BarChartGenerico'
import { BoxplotChart } from '../components/graficos/BoxplotChart'
import { GrillaCalor } from '../components/graficos/GrillaCalor'
import { LineChartGenerico } from '../components/graficos/LineChartGenerico'
import { ScatterChartGenerico } from '../components/graficos/ScatterChartGenerico'
import type { Dashboard } from '../types/api'
import { formatoPesos } from '../utils/formato'

function TarjetaMetrica({
  icono,
  color,
  etiqueta,
  valor,
}: {
  icono: React.ReactNode
  color: string
  etiqueta: string
  valor: string
}) {
  return (
    <Card>
      <Group gap="md" wrap="nowrap">
        <ThemeIcon size={42} radius="md" color={color} variant="light">
          {icono}
        </ThemeIcon>
        <div>
          <Text size="xs" c="dimmed">
            {etiqueta}
          </Text>
          <Text fz={22} fw={700}>
            {valor}
          </Text>
        </div>
      </Group>
    </Card>
  )
}

export function AnalisisExploratorio() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Dashboard>('/analisis/dashboard')
      .then((res) => setDashboard(res.data))
      .catch(() => setError('No se pudo cargar el análisis exploratorio.'))
  }, [])

  if (error)
    return (
      <Alert color="red" icon={<IconAlertCircle size={16} />} variant="light">
        {error}
      </Alert>
    )

  if (!dashboard)
    return (
      <Center py="xl">
        <Loader />
      </Center>
    )

  const { metricas } = dashboard

  return (
    <Stack>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <TarjetaMetrica
          icono={<IconReceipt size={22} />}
          color="blue"
          etiqueta="Total de consultas"
          valor={metricas.total_consultas.toLocaleString('es-AR')}
        />
        <TarjetaMetrica
          icono={<IconReportMoney size={22} />}
          color="grape"
          etiqueta="Precio de lista promedio"
          valor={formatoPesos(metricas.precio_lista_promedio)}
        />
        <TarjetaMetrica icono={<IconCoin size={22} />} color="teal" etiqueta="Ahorro promedio" valor={formatoPesos(metricas.ahorro_promedio)} />
        <TarjetaMetrica
          icono={<IconAlertTriangle size={22} />}
          color="orange"
          etiqueta="Consultas con stock crítico"
          valor={String(metricas.consultas_stock_critico)}
        />
      </SimpleGrid>

      <Card>
        <Title order={4}>Top 15 obras sociales por volumen de consultas</Title>
        <BarChartGenerico
          datos={dashboard.top_obras_sociales.slice().reverse()}
          claveCategoria="categoria"
          claveValor="valor"
          vertical
          alto={420}
        />
        <Text size="xs" c="dimmed" mt="xs">
          Obras sociales prioritarias a la hora de negociar convenios.
        </Text>
      </Card>

      <Card>
        <Title order={4}>Top 10 productos más consultados</Title>
        <BarChartGenerico datos={dashboard.top_productos.slice().reverse()} claveCategoria="categoria" claveValor="valor" vertical alto={340} />
        <Text size="xs" c="dimmed" mt="xs">
          Qué productos mueven más volumen de mostrador.
        </Text>
      </Card>

      <Card>
        <Title order={4}>Consultas por día de la semana</Title>
        <BarChartGenerico datos={dashboard.consultas_por_dia} claveCategoria="categoria" claveValor="valor" />
        <Text size="xs" c="dimmed" mt="xs">
          Permite ver si hay días de mayor demanda para planificar la dotación de personal.
        </Text>
      </Card>

      <Card>
        <Title order={4}>Distribución del precio de lista</Title>
        <BarChartGenerico
          datos={dashboard.distribucion_precio_lista.map((b) => ({ rango: `${formatoPesos(b.desde)}`, cantidad: b.cantidad }))}
          claveCategoria="rango"
          claveValor="cantidad"
          colorBarra="#10b981"
        />
      </Card>

      <Card>
        <Title order={4}>Stock promedio por categoría</Title>
        <BarChartGenerico datos={dashboard.stock_promedio_categoria} claveCategoria="categoria" claveValor="valor" colorBarra="#f97316" />
      </Card>

      <Card>
        <Title order={4} mb="md">
          Productos con stock crítico
        </Title>
        <Table striped highlightOnHover verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Producto</Table.Th>
              <Table.Th>Categoría</Table.Th>
              <Table.Th>Stock disponible</Table.Th>
              <Table.Th>Fecha</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {dashboard.stock_critico.map((fila, i) => (
              <Table.Tr key={i}>
                <Table.Td>{fila.producto_nombre}</Table.Td>
                <Table.Td>{fila.categoria}</Table.Td>
                <Table.Td>{fila.stock_disponible}</Table.Td>
                <Table.Td>{fila.fecha}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Card>
        <Title order={4}>Precio de lista vs. precio final, según promoción bancaria</Title>
        <ScatterChartGenerico
          datos={dashboard.dispersion_precio}
          claveX="precio_lista"
          claveY="precio_final"
          claveGrupo="banco_promocion"
          nombreX="Precio de lista"
          nombreY="Precio final"
        />
      </Card>

      <Card>
        <Title order={4}>Descuento acumulado promedio por día de la semana</Title>
        <LineChartGenerico
          datos={dashboard.descuento_por_dia}
          claveCategoria="categoria"
          claveValor="valor"
          formatoY={(v) => `${Math.round(v * 100)}%`}
        />
      </Card>

      <Card>
        <Title order={4}>Distribución del precio de lista por categoría</Title>
        <BoxplotChart datos={dashboard.boxplot_categoria} />
      </Card>

      <Card>
        <Title order={4}>Matriz de correlación de variables numéricas</Title>
        <GrillaCalor columnas={dashboard.correlacion.columnas} valores={dashboard.correlacion.valores} />
      </Card>

      <Card>
        <Title order={4}>Proporción de consultas con/sin promoción bancaria</Title>
        <BarChartGenerico datos={dashboard.proporcion_con_promocion} claveCategoria="categoria" claveValor="valor" colorBarra="#a855f7" alto={220} />
      </Card>
    </Stack>
  )
}
