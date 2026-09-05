import { Autocomplete, Button, Card, Select, Stack, Text, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCheck } from '@tabler/icons-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import type { Cliente, ConsultaIn, Producto } from '../../types/api'
import { formatoPesos } from '../../utils/formato'

const METODOS_PAGO = ['Efectivo', 'Débito', 'Banco Provincia', 'Billetera Virtual (Modo/Mercado Pago)', 'Macro', 'Galicia', 'Santander', 'Nación']

export function RegistrarConsulta() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [obrasSociales, setObrasSociales] = useState<string[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [enviando, setEnviando] = useState(false)

  const [productoId, setProductoId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<ConsultaIn, 'producto_id'>>({
    cliente_nombre: '',
    cliente_tel: '',
    obra_social: '',
    plan_afiliado: 'Plan General',
    metodo_pago: METODOS_PAGO[0],
    fecha: new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    api.get<Producto[]>('/catalogos/productos').then((res) => setProductos(res.data))
    api.get<string[]>('/catalogos/obras-sociales').then((res) => setObrasSociales(res.data))
    api.get<Cliente[]>('/clientes').then((res) => setClientes(res.data))
  }, [])

  const productoSeleccionado = productos.find((p) => String(p.id) === productoId)

  function elegirCliente(nombre: string) {
    const encontrado = clientes.find((c) => c.nombre === nombre)
    setForm({ ...form, cliente_nombre: nombre, cliente_tel: encontrado?.telefono ?? form.cliente_tel })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!productoId || !form.cliente_nombre.trim() || !form.obra_social.trim()) {
      notifications.show({ title: 'Faltan datos', message: 'Completá cliente, producto y obra social.', color: 'red' })
      return
    }
    setEnviando(true)
    try {
      const res = await api.post('/consultas', { ...form, producto_id: Number(productoId) })
      notifications.show({
        title: 'Registro cargado',
        message: `${res.data.producto_nombre} - ${res.data.obra_social} - ${formatoPesos(res.data.precio_final)}`,
        color: 'teal',
        icon: <IconCheck size={18} />,
      })
      setForm({ ...form, cliente_nombre: '', cliente_tel: '' })
      setProductoId(null)
      api.get<Cliente[]>('/clientes').then((r) => setClientes(r.data))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card maw={480}>
      <Title order={4} mb="md">
        Nuevo registro de consulta
      </Title>
      <form onSubmit={onSubmit}>
        <Stack gap="md">
          <Autocomplete
            label="Cliente"
            description="Elegí uno existente o escribí uno nuevo"
            data={Array.from(new Set(clientes.map((c) => c.nombre)))}
            value={form.cliente_nombre}
            onChange={(v) => elegirCliente(v)}
          />
          <TextInput
            label="Teléfono del cliente"
            value={form.cliente_tel}
            onChange={(e) => setForm({ ...form, cliente_tel: e.currentTarget.value })}
          />
          <Autocomplete
            label="Obra social"
            data={obrasSociales}
            value={form.obra_social}
            onChange={(v) => setForm({ ...form, obra_social: v })}
          />
          <Select
            label="Producto"
            description="El precio, stock y categoría se toman del catálogo de Productos"
            data={productos.map((p) => ({ value: String(p.id), label: p.producto_nombre }))}
            value={productoId}
            onChange={setProductoId}
            searchable
          />
          {productoSeleccionado && (
            <Text size="xs" c="dimmed">
              {productoSeleccionado.categoria} · {formatoPesos(productoSeleccionado.precio_lista)} · stock {productoSeleccionado.stock_disponible}
            </Text>
          )}
          <Select label="Método de pago" data={METODOS_PAGO} value={form.metodo_pago} onChange={(v) => setForm({ ...form, metodo_pago: v ?? METODOS_PAGO[0] })} />
          <TextInput
            label="Fecha de la consulta"
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.currentTarget.value })}
          />
          <Button type="submit" loading={enviando}>
            Cargar registro
          </Button>
        </Stack>
      </form>
    </Card>
  )
}
