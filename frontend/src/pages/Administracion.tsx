import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { ConsultaIn, Plan } from '../types/api'
import { formatoPorcentaje } from '../utils/formato'

const CATEGORIAS_POR_DEFECTO = ['Analgesicos', 'Antibioticos', 'Antialergicos', 'Dermatologicos', 'Vitaminas']
const METODOS_PAGO = ['Efectivo', 'Débito', 'Banco Provincia', 'Billetera Virtual (Modo/Mercado Pago)', 'Macro', 'Galicia', 'Santander', 'Nación']

export function Administracion() {
  const [planes, setPlanes] = useState<Plan[]>([])
  const [mensaje, setMensaje] = useState<string | null>(null)

  const [nombrePlan, setNombrePlan] = useState('')
  const [descuentoPlan, setDescuentoPlan] = useState(40)

  const [consulta, setConsulta] = useState<ConsultaIn>({
    cliente_nombre: '',
    cliente_tel: '',
    obra_social: '',
    plan_afiliado: 'Plan General',
    producto_nombre: '',
    categoria: CATEGORIAS_POR_DEFECTO[0],
    precio_lista: 0,
    stock_disponible: 0,
    metodo_pago: METODOS_PAGO[0],
    requiere_receta: false,
    fecha: new Date().toISOString().slice(0, 10),
  })

  function cargarPlanes() {
    api.get<Plan[]>('/planes').then((res) => setPlanes(res.data))
  }

  useEffect(cargarPlanes, [])

  async function onSubmitPlan(e: FormEvent) {
    e.preventDefault()
    if (!nombrePlan.trim()) return
    await api.post('/planes', { obra_social: nombrePlan, descuento_pct: descuentoPlan })
    setMensaje(`Plan '${nombrePlan}' cargado con ${descuentoPlan}% de descuento.`)
    setNombrePlan('')
    cargarPlanes()
  }

  async function onSubmitConsulta(e: FormEvent) {
    e.preventDefault()
    if (!consulta.cliente_nombre.trim() || !consulta.producto_nombre.trim() || consulta.precio_lista <= 0) {
      setMensaje('Completá al menos cliente, producto y un precio de lista mayor a 0.')
      return
    }
    const res = await api.post('/consultas', consulta)
    setMensaje(`Registro cargado: ${res.data.producto_nombre} - ${res.data.obra_social}.`)
    setConsulta({ ...consulta, cliente_nombre: '', cliente_tel: '', producto_nombre: '', precio_lista: 0, stock_disponible: 0 })
  }

  return (
    <div className="pantalla-administracion">
      <p className="caption">Los registros y planes que cargues acá quedan guardados directamente en la base de datos.</p>
      {mensaje && <p className="mensaje-exito">{mensaje}</p>}

      <div className="grilla-admin">
        <form className="tarjeta" onSubmit={onSubmitPlan}>
          <h3>Nueva obra social / plan</h3>
          <label>
            Nombre de la obra social o plan
            <input value={nombrePlan} onChange={(e) => setNombrePlan(e.target.value)} />
          </label>
          <label>
            Descuento (%)
            <input type="range" min={0} max={100} step={5} value={descuentoPlan} onChange={(e) => setDescuentoPlan(Number(e.target.value))} />
            <span>{descuentoPlan}%</span>
          </label>
          <button type="submit">Cargar plan</button>
        </form>

        <form className="tarjeta" onSubmit={onSubmitConsulta}>
          <h3>Nuevo registro de consulta</h3>
          <label>
            Nombre del cliente
            <input value={consulta.cliente_nombre} onChange={(e) => setConsulta({ ...consulta, cliente_nombre: e.target.value })} />
          </label>
          <label>
            Teléfono del cliente
            <input value={consulta.cliente_tel} onChange={(e) => setConsulta({ ...consulta, cliente_tel: e.target.value })} />
          </label>
          <label>
            Obra social
            <input value={consulta.obra_social} onChange={(e) => setConsulta({ ...consulta, obra_social: e.target.value })} />
          </label>
          <label>
            Producto
            <input value={consulta.producto_nombre} onChange={(e) => setConsulta({ ...consulta, producto_nombre: e.target.value })} />
          </label>
          <label>
            Categoría
            <select value={consulta.categoria} onChange={(e) => setConsulta({ ...consulta, categoria: e.target.value })}>
              {CATEGORIAS_POR_DEFECTO.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Precio de lista
            <input type="number" min={0} step={100} value={consulta.precio_lista} onChange={(e) => setConsulta({ ...consulta, precio_lista: Number(e.target.value) })} />
          </label>
          <label>
            Stock disponible
            <input type="number" min={0} step={1} value={consulta.stock_disponible} onChange={(e) => setConsulta({ ...consulta, stock_disponible: Number(e.target.value) })} />
          </label>
          <label>
            Método de pago
            <select value={consulta.metodo_pago} onChange={(e) => setConsulta({ ...consulta, metodo_pago: e.target.value })}>
              {METODOS_PAGO.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="label-checkbox">
            <input type="checkbox" checked={consulta.requiere_receta} onChange={(e) => setConsulta({ ...consulta, requiere_receta: e.target.checked })} />
            Requiere receta
          </label>
          <label>
            Fecha de la consulta
            <input type="date" value={consulta.fecha} onChange={(e) => setConsulta({ ...consulta, fecha: e.target.value })} />
          </label>
          <button type="submit">Cargar registro</button>
        </form>
      </div>

      <div className="tarjeta">
        <h3>Planes de descuento cargados ({planes.length})</h3>
        <table className="tabla">
          <thead>
            <tr>
              <th>Obra social</th>
              <th>Descuento</th>
            </tr>
          </thead>
          <tbody>
            {planes.map((p) => (
              <tr key={p.obra_social}>
                <td>{p.obra_social}</td>
                <td>{formatoPorcentaje(p.descuento_os)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
