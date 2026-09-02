import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Desglose, MedioPago, Producto, StockInfo } from '../types/api'
import { formatoPesos, formatoPorcentaje } from '../utils/formato'

export function ConsultaPrecio() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [obrasSociales, setObrasSociales] = useState<string[]>([])
  const [metodosPago, setMetodosPago] = useState<string[]>([])

  const [producto, setProducto] = useState('')
  const [obraSocial, setObraSocial] = useState('')
  const [metodoPago, setMetodoPago] = useState('')

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
    <div className="pantalla-consulta">
      <div className="tarjeta panel-filtros">
        <h2>Consulta de precio</h2>
        <label>
          Producto
          <select value={producto} onChange={(e) => setProducto(e.target.value)}>
            {productos.map((p) => (
              <option key={p.producto_nombre} value={p.producto_nombre}>
                {p.producto_nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Obra social
          <select value={obraSocial} onChange={(e) => setObraSocial(e.target.value)}>
            {obrasSociales.map((os) => (
              <option key={os} value={os}>
                {os}
              </option>
            ))}
          </select>
        </label>
        <label>
          Método de pago
          <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
            {metodosPago.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <button onClick={calcular} disabled={cargando}>
          {cargando ? 'Calculando...' : 'Calcular precio'}
        </button>
        {error && <p className="mensaje-error">{error}</p>}
      </div>

      {desglose && (
        <div className="resultado-consulta">
          <div className="tarjeta">
            <h3>Ticket de consulta: {desglose.producto_nombre}</h3>
            <div className="metricas-fila">
              <div className="metrica">
                <span className="metrica-label">Precio de lista</span>
                <span className="metrica-valor">{formatoPesos(desglose.precio_lista)}</span>
              </div>
              <div className="metrica">
                <span className="metrica-label">Descuento aplicado</span>
                <span className="metrica-valor">{formatoPorcentaje(desglose.descuento_total_pct / 100)}</span>
              </div>
              <div className="metrica metrica-destacada">
                <span className="metrica-label">PRECIO FINAL</span>
                <span className="metrica-valor">{formatoPesos(desglose.precio_final)}</span>
                <span className="metrica-delta">-{formatoPesos(desglose.ahorro_total)}</span>
              </div>
            </div>
            <pre className="desglose-texto">
              {`Precio de lista: ${formatoPesos(desglose.precio_lista)}\n\n` +
                `- Descuento obra social ${desglose.obra_social} (${formatoPorcentaje(desglose.descuento_os)}): ` +
                `-${formatoPesos(desglose.precio_lista - desglose.precio_tras_os)}   ->   ${formatoPesos(desglose.precio_tras_os)}\n` +
                `- Descuento banco ${desglose.metodo_pago} (${formatoPorcentaje(desglose.descuento_banco)}): ` +
                `-${formatoPesos(desglose.precio_tras_os - desglose.precio_final)}   ->   ${formatoPesos(desglose.precio_final)}\n\n` +
                `TOTAL A ABONAR: ${formatoPesos(desglose.precio_final)}   (ahorro total: ${formatoPesos(desglose.ahorro_total)})`}
            </pre>
          </div>

          <div className="tarjeta">
            <h3>Comparación de medios de pago</h3>
            {comparacion.length > 0 && (
              <p className="mensaje-exito">
                La mejor opción es pagar con <strong>{comparacion[0].metodo_pago}</strong>: {formatoPesos(comparacion[0].precio_final)}{' '}
                (ahorro de {formatoPesos(comparacion[0].ahorro)} respecto de pagar sin promoción bancaria).
              </p>
            )}
            <table className="tabla">
              <thead>
                <tr>
                  <th>Método de pago</th>
                  <th>Descuento banco</th>
                  <th>Precio final</th>
                  <th>Ahorro</th>
                </tr>
              </thead>
              <tbody>
                {comparacion.map((fila) => (
                  <tr key={fila.metodo_pago}>
                    <td>{fila.metodo_pago}</td>
                    <td>{formatoPorcentaje(fila.descuento_banco)}</td>
                    <td>{formatoPesos(fila.precio_final)}</td>
                    <td>{formatoPesos(fila.ahorro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {stock && (
            <div className="tarjeta">
              <h3>Stock disponible</h3>
              {stock.alerta ? (
                <p className="mensaje-alerta">
                  Stock bajo: quedan {stock.stock_actual} unidades de '{stock.producto_nombre}' (umbral: {stock.umbral}).
                </p>
              ) : (
                <p className="mensaje-exito">Stock disponible: {stock.stock_actual} unidades. No hay alerta de stock.</p>
              )}
              {stock.alerta && stock.alternativas.length > 0 && (
                <>
                  <p>Alternativas sugeridas:</p>
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Stock disponible</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stock.alternativas.map((alt) => (
                        <tr key={alt.producto_nombre}>
                          <td>{alt.producto_nombre}</td>
                          <td>{alt.stock_disponible}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              {stock.alerta && stock.alternativas.length === 0 && <p>No se encontraron alternativas con stock suficiente en la misma categoría.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
