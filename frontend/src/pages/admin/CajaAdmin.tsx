import { Alert, Badge, Button, Card, Group, Modal, NumberInput, Select, SimpleGrid, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconAlertCircle, IconCash, IconLock } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import type { CajaSesion } from '../../types/api'
import { formatoPesos } from '../../utils/formato'

const COLOR_ORIGEN: Record<string, string> = { venta: 'teal', manual: 'gray', venta_cancelada: 'red' }

export function CajaAdmin() {
  const { usuario } = useAuth()
  const esAdmin = usuario?.es_admin ?? false

  const [cajaActual, setCajaActual] = useState<CajaSesion | null>(null)
  const [sinCajaAbierta, setSinCajaAbierta] = useState(false)
  const [historial, setHistorial] = useState<CajaSesion[]>([])

  const [montoInicial, setMontoInicial] = useState(0)
  const [observacionesApertura, setObservacionesApertura] = useState('')
  const [abriendo, setAbriendo] = useState(false)

  const [tipoMovimiento, setTipoMovimiento] = useState<string | null>('ingreso')
  const [montoMovimiento, setMontoMovimiento] = useState(0)
  const [conceptoMovimiento, setConceptoMovimiento] = useState('')
  const [registrandoMovimiento, setRegistrandoMovimiento] = useState(false)

  const [modalCierre, setModalCierre] = useState(false)
  const [montoDeclarado, setMontoDeclarado] = useState(0)
  const [observacionesCierre, setObservacionesCierre] = useState('')
  const [cerrando, setCerrando] = useState(false)

  function cargarCajaActual() {
    api
      .get<CajaSesion>('/caja/actual')
      .then((res) => {
        setCajaActual(res.data)
        setSinCajaAbierta(false)
      })
      .catch(() => {
        setCajaActual(null)
        setSinCajaAbierta(true)
      })
  }

  function cargarHistorial() {
    if (!esAdmin) return
    api
      .get<CajaSesion[]>('/caja/historial')
      .then((res) => setHistorial(res.data))
      .catch(() => notifications.show({ title: 'No se pudo cargar', message: 'No se pudo cargar el historial de cajas.', color: 'red' }))
  }

  useEffect(() => {
    cargarCajaActual()
    cargarHistorial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function abrirCaja() {
    setAbriendo(true)
    try {
      await api.post('/caja/abrir', { monto_inicial: montoInicial, observaciones: observacionesApertura.trim() || null })
      notifications.show({ title: 'Caja abierta', message: formatoPesos(montoInicial), color: 'teal' })
      setMontoInicial(0)
      setObservacionesApertura('')
      cargarCajaActual()
    } catch (err: unknown) {
      const detalle = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notifications.show({ title: 'No se pudo abrir la caja', message: detalle ?? 'Intentá de nuevo.', color: 'red' })
    } finally {
      setAbriendo(false)
    }
  }

  async function registrarMovimiento() {
    if (!tipoMovimiento || montoMovimiento <= 0 || !conceptoMovimiento.trim()) return
    setRegistrandoMovimiento(true)
    try {
      await api.post('/caja/movimientos', { tipo: tipoMovimiento, monto: montoMovimiento, concepto: conceptoMovimiento.trim() })
      notifications.show({ title: 'Movimiento registrado', message: conceptoMovimiento, color: 'teal' })
      setMontoMovimiento(0)
      setConceptoMovimiento('')
      cargarCajaActual()
    } catch (err: unknown) {
      const detalle = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notifications.show({ title: 'No se pudo registrar', message: detalle ?? 'Intentá de nuevo.', color: 'red' })
    } finally {
      setRegistrandoMovimiento(false)
    }
  }

  function abrirModalCierre() {
    setMontoDeclarado(cajaActual?.saldo_actual ?? 0)
    setObservacionesCierre('')
    setModalCierre(true)
  }

  async function cerrarCaja() {
    setCerrando(true)
    try {
      await api.post('/caja/cerrar', { monto_declarado: montoDeclarado, observaciones: observacionesCierre.trim() || null })
      notifications.show({ title: 'Caja cerrada', message: `Declarado: ${formatoPesos(montoDeclarado)}`, color: 'teal' })
      setModalCierre(false)
      cargarCajaActual()
      cargarHistorial()
    } catch (err: unknown) {
      const detalle = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notifications.show({ title: 'No se pudo cerrar', message: detalle ?? 'Intentá de nuevo.', color: 'red' })
    } finally {
      setCerrando(false)
    }
  }

  const diferenciaPreview = montoDeclarado - (cajaActual?.saldo_actual ?? 0)

  return (
    <Stack gap="lg">
      {sinCajaAbierta && (
        <Card>
          <Title order={4} mb="md">
            Abrir caja
          </Title>
          <Stack gap="sm" maw={360}>
            <NumberInput label="Monto inicial" min={0} value={montoInicial} onChange={(v) => setMontoInicial(Number(v) || 0)} />
            <TextInput label="Observaciones (opcional)" value={observacionesApertura} onChange={(e) => setObservacionesApertura(e.currentTarget.value)} />
            <Button leftSection={<IconCash size={16} />} onClick={abrirCaja} loading={abriendo}>
              Abrir caja
            </Button>
          </Stack>
        </Card>
      )}

      {cajaActual && (
        <>
          <Card>
            <Group justify="space-between" mb="md">
              <Title order={4}>Caja abierta</Title>
              <Button color="red" leftSection={<IconLock size={16} />} onClick={abrirModalCierre}>
                Cerrar caja
              </Button>
            </Group>
            <SimpleGrid cols={{ base: 1, xs: 4 }}>
              <div>
                <Text size="xs" c="dimmed">
                  Monto inicial
                </Text>
                <Text fz={20} fw={700}>
                  {formatoPesos(cajaActual.monto_inicial)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Ingresos
                </Text>
                <Text fz={20} fw={700} c="teal">
                  {formatoPesos(cajaActual.total_ingresos)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Egresos
                </Text>
                <Text fz={20} fw={700} c="red">
                  {formatoPesos(cajaActual.total_egresos)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Saldo actual
                </Text>
                <Text fz={20} fw={700} c="blue">
                  {formatoPesos(cajaActual.saldo_actual)}
                </Text>
              </div>
            </SimpleGrid>
          </Card>

          <Card>
            <Title order={4} mb="md">
              Registrar ingreso / egreso manual
            </Title>
            <Group align="flex-end">
              <Select label="Tipo" data={[{ value: 'ingreso', label: 'Ingreso' }, { value: 'egreso', label: 'Egreso' }]} value={tipoMovimiento} onChange={setTipoMovimiento} w={140} />
              <NumberInput label="Monto" min={0} value={montoMovimiento} onChange={(v) => setMontoMovimiento(Number(v) || 0)} w={150} />
              <TextInput label="Concepto" value={conceptoMovimiento} onChange={(e) => setConceptoMovimiento(e.currentTarget.value)} flex={1} />
              <Button onClick={registrarMovimiento} loading={registrandoMovimiento}>
                Registrar
              </Button>
            </Group>
          </Card>

          <Card>
            <Title order={4} mb="md">
              Movimientos
            </Title>
            <Table striped highlightOnHover verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Origen</Table.Th>
                  <Table.Th>Concepto</Table.Th>
                  <Table.Th>Usuario</Table.Th>
                  <Table.Th>Monto</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {cajaActual.movimientos.map((m) => (
                  <Table.Tr key={m.id}>
                    <Table.Td>{new Date(m.creado_en).toLocaleString('es-AR')}</Table.Td>
                    <Table.Td>{m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}</Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={COLOR_ORIGEN[m.origen] ?? 'gray'}>
                        {m.origen}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{m.concepto}</Table.Td>
                    <Table.Td>{m.usuario_username}</Table.Td>
                    <Table.Td c={m.tipo === 'ingreso' ? 'teal' : 'red'}>
                      {m.tipo === 'ingreso' ? '+' : '-'}
                      {formatoPesos(m.monto)}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </>
      )}

      {esAdmin && (
        <Card>
          <Title order={4} mb="md">
            Historial de cajas cerradas
          </Title>
          <Table striped highlightOnHover verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Apertura</Table.Th>
                <Table.Th>Cierre</Table.Th>
                <Table.Th>Abierta por</Table.Th>
                <Table.Th>Cerrada por</Table.Th>
                <Table.Th>Declarado</Table.Th>
                <Table.Th>Calculado</Table.Th>
                <Table.Th>Diferencia</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {historial.map((s) => (
                <Table.Tr key={s.id}>
                  <Table.Td>{new Date(s.abierta_en).toLocaleString('es-AR')}</Table.Td>
                  <Table.Td>{s.cerrada_en ? new Date(s.cerrada_en).toLocaleString('es-AR') : '—'}</Table.Td>
                  <Table.Td>{s.abierta_por}</Table.Td>
                  <Table.Td>{s.cerrada_por ?? '—'}</Table.Td>
                  <Table.Td>{formatoPesos(s.monto_declarado ?? 0)}</Table.Td>
                  <Table.Td>{formatoPesos(s.monto_calculado ?? 0)}</Table.Td>
                  <Table.Td c={s.diferencia === 0 ? 'teal' : 'red'}>{formatoPesos(s.diferencia ?? 0)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      <Modal opened={modalCierre} onClose={() => setModalCierre(false)} title="Cerrar caja">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Monto calculado según los movimientos: <strong>{formatoPesos(cajaActual?.saldo_actual ?? 0)}</strong>
          </Text>
          <NumberInput label="Monto declarado (arqueo real)" min={0} value={montoDeclarado} onChange={(v) => setMontoDeclarado(Number(v) || 0)} data-autofocus />
          <TextInput label="Observaciones (opcional)" value={observacionesCierre} onChange={(e) => setObservacionesCierre(e.currentTarget.value)} />
          {diferenciaPreview !== 0 && (
            <Alert color={diferenciaPreview > 0 ? 'teal' : 'red'} icon={<IconAlertCircle size={16} />} variant="light">
              Diferencia: {formatoPesos(diferenciaPreview)} {diferenciaPreview > 0 ? '(sobrante)' : '(faltante)'}
            </Alert>
          )}
          <Button onClick={cerrarCaja} loading={cerrando} color="red">
            Confirmar cierre
          </Button>
        </Stack>
      </Modal>
    </Stack>
  )
}
