import {
  ActionIcon,
  Alert,
  Autocomplete,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  NumberInput,
  Select,
  SegmentedControl,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconBarcode,
  IconCheck,
  IconEye,
  IconRefresh,
  IconSearch,
  IconShoppingCartPlus,
  IconTrashX,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Cliente, Desglose, Pedido, Producto, Receta, ValidacionOSResultado } from '../types/api'
import { formatoPesos } from '../utils/formato'

interface LineaCarrito {
  producto: Producto
  cantidad: number
}

const COLOR_VALIDACION_OS: Record<string, string> = { aprobado: 'teal', rechazado: 'red', vencido: 'yellow' }
const COLOR_CAE: Record<string, string> = { aprobado: 'teal', rechazado: 'red', pendiente: 'gray' }

const ETAPAS: { valor: Pedido['etapa']; etiqueta: string; color: string }[] = [
  { valor: 'a_preparar', etiqueta: 'A preparar', color: 'yellow' },
  { valor: 'preparado', etiqueta: 'Preparado', color: 'blue' },
  { valor: 'entregado', etiqueta: 'Entregado', color: 'grape' },
  { valor: 'pagado', etiqueta: 'Pagado', color: 'teal' },
]

function etapaInfo(valor: Pedido['etapa']) {
  return ETAPAS.find((e) => e.valor === valor) ?? ETAPAS[0]
}

function extraerDetalle(err: unknown): string | undefined {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
}

export function Pedidos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [obrasSociales, setObrasSociales] = useState<string[]>([])
  const [metodosPago, setMetodosPago] = useState<string[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [historial, setHistorial] = useState<Pedido[]>([])

  const [obraSocial, setObraSocial] = useState<string | null>(null)
  const [planAfiliado, setPlanAfiliado] = useState('')
  const [metodoPago, setMetodoPago] = useState<string | null>(null)
  const [carrito, setCarrito] = useState<LineaCarrito[]>([])
  const [preciosPorProducto, setPreciosPorProducto] = useState<Record<number, number>>({})
  const [validacionOS, setValidacionOS] = useState<ValidacionOSResultado | null>(null)

  const [productoIdParaAgregar, setProductoIdParaAgregar] = useState<string | null>(null)
  const [cantidadParaAgregar, setCantidadParaAgregar] = useState(1)
  const [codigoBarras, setCodigoBarras] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTel, setClienteTel] = useState('')
  const [recetasDisponibles, setRecetasDisponibles] = useState<Record<number, Receta[]>>({})
  const [recetaElegida, setRecetaElegida] = useState<Record<number, number | null>>({})
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reintentandoCae, setReintentandoCae] = useState<number | null>(null)
  const [busquedaHistorial, setBusquedaHistorial] = useState('')
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null)
  const [cambiandoEtapa, setCambiandoEtapa] = useState(false)

  function cargarCatalogos() {
    Promise.all([
      api.get<Producto[]>('/catalogos/productos'),
      api.get<string[]>('/catalogos/obras-sociales'),
      api.get<string[]>('/catalogos/metodos-pago'),
      api.get<Cliente[]>('/clientes'),
    ])
      .then(([resProductos, resObras, resMetodos, resClientes]) => {
        setProductos(resProductos.data)
        setObrasSociales(resObras.data)
        setMetodosPago(resMetodos.data)
        setClientes(resClientes.data)
        setObraSocial((prev) => prev ?? resObras.data[0] ?? null)
        setMetodoPago((prev) => prev ?? resMetodos.data[0] ?? null)
      })
      .catch(() => notifications.show({ title: 'No se pudo cargar', message: 'No se pudieron cargar los datos del pedido.', color: 'red' }))
  }

  function cargarHistorial() {
    api
      .get<Pedido[]>('/pedidos')
      .then((res) => setHistorial(res.data))
      .catch(() => notifications.show({ title: 'No se pudo cargar', message: 'No se pudo cargar el historial de pedidos.', color: 'red' }))
  }

  useEffect(() => {
    cargarCatalogos()
    cargarHistorial()
  }, [])

  const productoParaAgregar = productos.find((p) => String(p.id) === productoIdParaAgregar)

  function agregarProductoAlCarrito(producto: Producto, cantidad: number) {
    setCarrito((prev) => {
      const existente = prev.find((l) => l.producto.id === producto.id)
      if (existente) {
        return prev.map((l) => (l.producto.id === producto.id ? { ...l, cantidad: l.cantidad + cantidad } : l))
      }
      return [...prev, { producto, cantidad }]
    })
  }

  function agregarAlCarrito() {
    if (!productoParaAgregar || cantidadParaAgregar < 1) return
    agregarProductoAlCarrito(productoParaAgregar, cantidadParaAgregar)
    setProductoIdParaAgregar(null)
    setCantidadParaAgregar(1)
  }

  async function buscarPorCodigoBarras() {
    const codigo = codigoBarras.trim()
    if (!codigo) return
    try {
      const res = await api.get<Producto>(`/catalogos/productos/buscar-codigo-barras/${encodeURIComponent(codigo)}`)
      agregarProductoAlCarrito(res.data, 1)
      notifications.show({ title: 'Producto agregado', message: res.data.producto_nombre, color: 'teal' })
    } catch {
      notifications.show({ title: 'Código no encontrado', message: `No hay ningún producto con el código '${codigo}'.`, color: 'red' })
    } finally {
      setCodigoBarras('')
    }
  }

  function quitarDelCarrito(productoId: number) {
    setCarrito((prev) => prev.filter((l) => l.producto.id !== productoId))
  }

  function cambiarCantidad(productoId: number, cantidad: number) {
    setCarrito((prev) => prev.map((l) => (l.producto.id === productoId ? { ...l, cantidad } : l)))
  }

  useEffect(() => {
    if (carrito.length === 0 || !obraSocial || !metodoPago) {
      setPreciosPorProducto({})
      return
    }
    Promise.all(
      carrito.map((l) =>
        api.post<Desglose>('/calculadora/calcular', { producto_nombre: l.producto.producto_nombre, obra_social: obraSocial, metodo_pago: metodoPago }),
      ),
    )
      .then((respuestas) => {
        const mapa: Record<number, number> = {}
        respuestas.forEach((res, i) => {
          mapa[carrito[i].producto.id] = res.data.precio_final
        })
        setPreciosPorProducto(mapa)
      })
      .catch(() => notifications.show({ title: 'No se pudo calcular', message: 'No se pudo calcular el precio de algún producto del carrito.', color: 'red' }))
  }, [carrito, obraSocial, metodoPago])

  useEffect(() => {
    if (carrito.length === 0 || !obraSocial) {
      setValidacionOS(null)
      return
    }
    api
      .post<ValidacionOSResultado>('/obras-sociales-reglas/validar', { obra_social: obraSocial, plan_afiliado: planAfiliado.trim() || null })
      .then((res) => setValidacionOS(res.data))
      .catch(() => setValidacionOS(null))
  }, [carrito.length, obraSocial, planAfiliado])

  const clienteSeleccionado = clientes.find((c) => c.nombre === clienteNombre)
  const productosConReceta = carrito.filter((l) => l.producto.requiere_receta)

  useEffect(() => {
    if (!modalAbierto || productosConReceta.length === 0 || !clienteSeleccionado) {
      setRecetasDisponibles({})
      return
    }
    Promise.all(
      productosConReceta.map((l) =>
        api
          .get<Receta[]>('/recetas/disponibles', { params: { cliente_ref_id: clienteSeleccionado.id, producto_id: l.producto.id } })
          .then((res) => [l.producto.id, res.data] as const),
      ),
    ).then((resultados) => {
      const mapa: Record<number, Receta[]> = {}
      resultados.forEach(([productoId, recetas]) => {
        mapa[productoId] = recetas
      })
      setRecetasDisponibles(mapa)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalAbierto, clienteSeleccionado?.id, carrito])

  const total = carrito.reduce((acc, l) => acc + (preciosPorProducto[l.producto.id] ?? l.producto.precio_lista) * l.cantidad, 0)

  const historialFiltrado = historial.filter((p) => {
    const q = busquedaHistorial.trim().toLowerCase()
    if (!q) return true
    return (
      p.cliente_nombre.toLowerCase().includes(q) ||
      p.obra_social.toLowerCase().includes(q) ||
      (p.comprobante_numero ?? '').toLowerCase().includes(q)
    )
  })

  function elegirCliente(nombre: string) {
    const encontrado = clientes.find((c) => c.nombre === nombre)
    setClienteNombre(nombre)
    setClienteTel(encontrado?.telefono ?? clienteTel)
  }

  const recetasFaltantes = productosConReceta.filter((l) => !recetaElegida[l.producto.id])

  async function confirmarPedido() {
    if (!obraSocial || !metodoPago || carrito.length === 0 || !clienteNombre.trim()) {
      setError('Completá cliente, obra social, método de pago y al menos un producto.')
      return
    }
    if (productosConReceta.length > 0 && !clienteSeleccionado) {
      setError('Los productos que requieren receta necesitan un cliente ya registrado (ver sección Clientes).')
      return
    }
    if (recetasFaltantes.length > 0) {
      setError(`Falta elegir una receta validada para: ${recetasFaltantes.map((l) => l.producto.producto_nombre).join(', ')}.`)
      return
    }
    setConfirmando(true)
    setError(null)
    try {
      const res = await api.post<Pedido>('/pedidos', {
        cliente_nombre: clienteNombre.trim(),
        cliente_tel: clienteTel.trim(),
        obra_social: obraSocial,
        plan_afiliado: planAfiliado.trim(),
        metodo_pago: metodoPago,
        items: carrito.map((l) => ({ producto_id: l.producto.id, cantidad: l.cantidad, receta_id: recetaElegida[l.producto.id] ?? null })),
      })
      const pedido = res.data
      notifications.show({
        title: `Pedido confirmado · comprobante ${pedido.comprobante_numero}`,
        message:
          pedido.cae_estado === 'aprobado'
            ? `${formatoPesos(pedido.total)} · CAE aprobado`
            : `${formatoPesos(pedido.total)} · CAE rechazado (${pedido.cae_motivo_rechazo}). Podés reintentar desde el historial.`,
        color: pedido.cae_estado === 'aprobado' ? 'teal' : 'yellow',
        icon: <IconCheck size={18} />,
      })
      setCarrito([])
      setClienteNombre('')
      setClienteTel('')
      setPlanAfiliado('')
      setRecetaElegida({})
      setModalAbierto(false)
      cargarCatalogos()
      cargarHistorial()
    } catch (err: unknown) {
      setError(extraerDetalle(err) ?? 'No se pudo confirmar el pedido.')
    } finally {
      setConfirmando(false)
    }
  }

  function confirmarCancelacion(pedido: Pedido) {
    modals.openConfirmModal({
      title: 'Cancelar pedido',
      children: (
        <Text size="sm">
          Se va a devolver el stock reservado de los {pedido.items.length} producto(s) del pedido #{pedido.id}.
        </Text>
      ),
      labels: { confirm: 'Cancelar pedido', cancel: 'Volver' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const res = await api.post<Pedido>(`/pedidos/${pedido.id}/cancelar`)
          notifications.show({ title: 'Pedido cancelado', message: `#${pedido.id} · ${pedido.cliente_nombre}`, color: 'red' })
          setPedidoSeleccionado((prev) => (prev?.id === res.data.id ? res.data : prev))
          cargarCatalogos()
          cargarHistorial()
        } catch (err: unknown) {
          notifications.show({ title: 'No se pudo cancelar', message: extraerDetalle(err) ?? 'Intentá de nuevo.', color: 'red' })
        }
      },
    })
  }

  async function cambiarEtapa(pedido: Pedido, etapa: Pedido['etapa']) {
    if (etapa === pedido.etapa) return
    setCambiandoEtapa(true)
    try {
      const res = await api.post<Pedido>(`/pedidos/${pedido.id}/etapa`, { etapa })
      setHistorial((prev) => prev.map((p) => (p.id === res.data.id ? res.data : p)))
      setPedidoSeleccionado(res.data)
    } catch (err: unknown) {
      notifications.show({ title: 'No se pudo cambiar la etapa', message: extraerDetalle(err) ?? 'Intentá de nuevo.', color: 'red' })
    } finally {
      setCambiandoEtapa(false)
    }
  }

  async function reintentarCae(pedido: Pedido) {
    setReintentandoCae(pedido.id)
    try {
      const res = await api.post<Pedido>(`/pedidos/${pedido.id}/reintentar-cae`)
      notifications.show({
        title: res.data.cae_estado === 'aprobado' ? 'CAE aprobado' : 'CAE rechazado de nuevo',
        message: res.data.cae_estado === 'aprobado' ? `CAE: ${res.data.cae}` : res.data.cae_motivo_rechazo ?? '',
        color: res.data.cae_estado === 'aprobado' ? 'teal' : 'red',
      })
      setPedidoSeleccionado((prev) => (prev?.id === res.data.id ? res.data : prev))
      cargarHistorial()
    } catch (err: unknown) {
      notifications.show({ title: 'No se pudo reintentar', message: extraerDetalle(err) ?? 'Intentá de nuevo.', color: 'red' })
    } finally {
      setReintentandoCae(null)
    }
  }

  return (
    <Stack gap="lg">
      <Card>
        <Title order={4} mb="md">
          Agregar producto al carrito
        </Title>
        <Stack gap="sm">
          <Group align="flex-end">
            <TextInput
              label="Escanear código de barras"
              placeholder="Escaneá o tipeá el código y presioná Enter"
              leftSection={<IconBarcode size={16} />}
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  buscarPorCodigoBarras()
                }
              }}
              flex={1}
            />
          </Group>
          <Group align="flex-end">
            <Select
              label="Producto"
              description={productoParaAgregar ? `${productoParaAgregar.categoria} · ${formatoPesos(productoParaAgregar.precio_lista)} · stock ${productoParaAgregar.stock_disponible}` : undefined}
              data={productos.map((p) => ({ value: String(p.id), label: p.producto_nombre }))}
              value={productoIdParaAgregar}
              onChange={setProductoIdParaAgregar}
              searchable
              flex={1}
            />
            <NumberInput label="Cantidad" min={1} max={productoParaAgregar?.stock_disponible} value={cantidadParaAgregar} onChange={(v) => setCantidadParaAgregar(Number(v) || 1)} w={120} />
            <Button leftSection={<IconShoppingCartPlus size={16} />} onClick={agregarAlCarrito} disabled={!productoParaAgregar}>
              Agregar
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card>
        <Group justify="space-between" mb="md">
          <Title order={4}>Carrito</Title>
          <Group gap="sm">
            <Select label="Obra social" data={obrasSociales} value={obraSocial} onChange={setObraSocial} searchable w={200} />
            <TextInput label="Plan del afiliado (opcional)" value={planAfiliado} onChange={(e) => setPlanAfiliado(e.currentTarget.value)} w={180} />
            <Select label="Método de pago" data={metodosPago} value={metodoPago} onChange={setMetodoPago} w={220} />
          </Group>
        </Group>

        {validacionOS && (
          <Alert
            color={COLOR_VALIDACION_OS[validacionOS.resultado]}
            icon={<IconAlertTriangle size={16} />}
            variant="light"
            mb="md"
          >
            Validación de obra social: <strong>{validacionOS.resultado}</strong>
            {validacionOS.motivo ? ` — ${validacionOS.motivo}` : ''}
            {validacionOS.resultado !== 'aprobado' && ' (no bloquea la venta; se puede cobrar como particular)'}
          </Alert>
        )}

        {carrito.length === 0 ? (
          <Text size="sm" c="dimmed">
            Todavía no agregaste productos.
          </Text>
        ) : (
          <Stack gap="md">
            <Table striped highlightOnHover verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Producto</Table.Th>
                  <Table.Th>Cantidad</Table.Th>
                  <Table.Th>Precio unitario</Table.Th>
                  <Table.Th>Subtotal</Table.Th>
                  <Table.Th w={50} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {carrito.map((l) => {
                  const precioUnitario = preciosPorProducto[l.producto.id] ?? l.producto.precio_lista
                  return (
                    <Table.Tr key={l.producto.id}>
                      <Table.Td>
                        {l.producto.producto_nombre}
                        {l.producto.requiere_receta && (
                          <Badge ml={6} size="xs" color="orange" variant="light">
                            Requiere receta
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <NumberInput min={1} max={l.producto.stock_disponible} value={l.cantidad} onChange={(v) => cambiarCantidad(l.producto.id, Number(v) || 1)} w={90} />
                      </Table.Td>
                      <Table.Td>{formatoPesos(precioUnitario)}</Table.Td>
                      <Table.Td>{formatoPesos(precioUnitario * l.cantidad)}</Table.Td>
                      <Table.Td>
                        <ActionIcon variant="subtle" color="red" onClick={() => quitarDelCarrito(l.producto.id)} aria-label="Quitar">
                          <IconTrashX size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
            <Group justify="space-between">
              <Text fw={700} fz={18}>
                Total: {formatoPesos(total)}
              </Text>
              <Button onClick={() => setModalAbierto(true)}>Confirmar pedido</Button>
            </Group>
          </Stack>
        )}
      </Card>

      <Card>
        <Group justify="space-between" mb="md" wrap="wrap">
          <Title order={4}>Historial de pedidos</Title>
          <TextInput
            placeholder="Buscar por cliente, obra social o comprobante"
            leftSection={<IconSearch size={16} />}
            value={busquedaHistorial}
            onChange={(e) => setBusquedaHistorial(e.currentTarget.value)}
          />
        </Group>
        <Table striped highlightOnHover verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Comprobante</Table.Th>
              <Table.Th>Fecha</Table.Th>
              <Table.Th>Cliente</Table.Th>
              <Table.Th>Obra social</Table.Th>
              <Table.Th>Método de pago</Table.Th>
              <Table.Th>Total</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Etapa</Table.Th>
              <Table.Th>CAE</Table.Th>
              <Table.Th w={140} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {historialFiltrado.map((p) => (
              <Table.Tr key={p.id} opacity={p.estado === 'cancelado' ? 0.5 : 1}>
                <Table.Td>{p.comprobante_numero ?? '—'}</Table.Td>
                <Table.Td>{new Date(p.creado_en).toLocaleString('es-AR')}</Table.Td>
                <Table.Td>{p.cliente_nombre}</Table.Td>
                <Table.Td>{p.obra_social}</Table.Td>
                <Table.Td>{p.metodo_pago}</Table.Td>
                <Table.Td>{formatoPesos(p.total)}</Table.Td>
                <Table.Td>
                  <Badge variant="light" color={p.estado === 'confirmado' ? 'teal' : 'gray'}>
                    {p.estado === 'confirmado' ? 'Confirmado' : 'Cancelado'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color={etapaInfo(p.etapa).color}>
                    {etapaInfo(p.etapa).etiqueta}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color={COLOR_CAE[p.cae_estado]}>
                    {p.cae_estado}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <ActionIcon variant="subtle" onClick={() => setPedidoSeleccionado(p)} aria-label="Ver pedido">
                      <IconEye size={16} />
                    </ActionIcon>
                    {p.estado === 'confirmado' && p.cae_estado === 'rechazado' && (
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        loading={reintentandoCae === p.id}
                        onClick={() => reintentarCae(p)}
                        aria-label="Reintentar CAE"
                      >
                        <IconRefresh size={16} />
                      </ActionIcon>
                    )}
                    {p.estado === 'confirmado' && (
                      <ActionIcon variant="subtle" color="red" onClick={() => confirmarCancelacion(p)} aria-label="Cancelar pedido">
                        <IconTrashX size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Modal opened={modalAbierto} onClose={() => setModalAbierto(false)} title="Confirmar pedido">
        <Stack gap="md">
          <Autocomplete
            label="Cliente"
            description="Elegí uno existente o escribí uno nuevo"
            data={Array.from(new Set(clientes.map((c) => c.nombre)))}
            value={clienteNombre}
            onChange={elegirCliente}
            data-autofocus
          />
          <TextInput label="Teléfono del cliente" value={clienteTel} onChange={(e) => setClienteTel(e.currentTarget.value)} />

          {productosConReceta.length > 0 && !clienteSeleccionado && (
            <Alert color="orange" icon={<IconAlertTriangle size={16} />} variant="light">
              Hay productos que requieren receta: elegí un cliente ya registrado (ver Administración → Clientes).
            </Alert>
          )}

          {productosConReceta.map((l) => (
            <Select
              key={l.producto.id}
              label={`Receta validada para ${l.producto.producto_nombre}`}
              placeholder={clienteSeleccionado ? 'Elegí una receta validada' : 'Elegí un cliente primero'}
              disabled={!clienteSeleccionado}
              data={(recetasDisponibles[l.producto.id] ?? []).map((r) => ({
                value: String(r.id),
                label: `${r.fecha_emision}${r.medico_nombre ? ` · ${r.medico_nombre}` : ''}`,
              }))}
              value={recetaElegida[l.producto.id] ? String(recetaElegida[l.producto.id]) : null}
              onChange={(v) => setRecetaElegida({ ...recetaElegida, [l.producto.id]: v ? Number(v) : null })}
            />
          ))}

          <Text size="sm" c="dimmed">
            {carrito.length} producto(s) · Total {formatoPesos(total)}
          </Text>
          {error && (
            <Alert color="red" icon={<IconAlertCircle size={16} />} variant="light">
              {error}
            </Alert>
          )}
          <Button onClick={confirmarPedido} loading={confirmando}>
            Confirmar y descontar stock
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={!!pedidoSeleccionado}
        onClose={() => setPedidoSeleccionado(null)}
        title={pedidoSeleccionado ? `Pedido ${pedidoSeleccionado.comprobante_numero ?? `#${pedidoSeleccionado.id}`}` : ''}
        size="lg"
      >
        {pedidoSeleccionado && (
          <Stack gap="md">
            <Group justify="space-between" wrap="wrap">
              <div>
                <Text fw={600}>{pedidoSeleccionado.cliente_nombre}</Text>
                <Text size="sm" c="dimmed">
                  {pedidoSeleccionado.cliente_tel || 'Sin teléfono'}
                </Text>
              </div>
              <Badge variant="light" color={pedidoSeleccionado.estado === 'confirmado' ? 'teal' : 'gray'}>
                {pedidoSeleccionado.estado === 'confirmado' ? 'Confirmado' : 'Cancelado'}
              </Badge>
            </Group>

            <Group gap="xl">
              <div>
                <Text size="xs" c="dimmed">
                  Obra social
                </Text>
                <Text size="sm">
                  {pedidoSeleccionado.obra_social}
                  {pedidoSeleccionado.plan_afiliado ? ` · ${pedidoSeleccionado.plan_afiliado}` : ''}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Método de pago
                </Text>
                <Text size="sm">{pedidoSeleccionado.metodo_pago}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Fecha
                </Text>
                <Text size="sm">{new Date(pedidoSeleccionado.creado_en).toLocaleString('es-AR')}</Text>
              </div>
            </Group>

            <Divider label="Etapa del pedido" labelPosition="left" />
            <SegmentedControl
              fullWidth
              disabled={pedidoSeleccionado.estado === 'cancelado' || cambiandoEtapa}
              value={pedidoSeleccionado.etapa}
              onChange={(v) => cambiarEtapa(pedidoSeleccionado, v as Pedido['etapa'])}
              data={ETAPAS.map((e) => ({ value: e.valor, label: e.etiqueta }))}
            />

            <Divider label="Productos" labelPosition="left" />
            <Table striped verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Producto</Table.Th>
                  <Table.Th>Cantidad</Table.Th>
                  <Table.Th>Precio unitario</Table.Th>
                  <Table.Th>Subtotal</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pedidoSeleccionado.items.map((item) => (
                  <Table.Tr key={item.producto_id}>
                    <Table.Td>{item.producto_nombre}</Table.Td>
                    <Table.Td>{item.cantidad}</Table.Td>
                    <Table.Td>{formatoPesos(item.precio_final_unitario)}</Table.Td>
                    <Table.Td>{formatoPesos(item.subtotal)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            <Group justify="space-between">
              <Text fw={700} fz={18}>
                Total: {formatoPesos(pedidoSeleccionado.total)}
              </Text>
              <Badge variant="light" color={COLOR_CAE[pedidoSeleccionado.cae_estado]}>
                CAE: {pedidoSeleccionado.cae_estado}
              </Badge>
            </Group>

            {pedidoSeleccionado.estado === 'confirmado' && (
              <Group justify="flex-end">
                {pedidoSeleccionado.cae_estado === 'rechazado' && (
                  <Button
                    variant="light"
                    leftSection={<IconRefresh size={16} />}
                    loading={reintentandoCae === pedidoSeleccionado.id}
                    onClick={() => reintentarCae(pedidoSeleccionado)}
                  >
                    Reintentar CAE
                  </Button>
                )}
                <Button
                  variant="light"
                  color="red"
                  leftSection={<IconTrashX size={16} />}
                  onClick={() => confirmarCancelacion(pedidoSeleccionado)}
                >
                  Cancelar pedido
                </Button>
              </Group>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  )
}
