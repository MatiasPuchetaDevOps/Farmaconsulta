import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { BarChartGenerico } from '../components/graficos/BarChartGenerico'
import { BoxplotChart } from '../components/graficos/BoxplotChart'
import { GrillaCalor } from '../components/graficos/GrillaCalor'
import { LineChartGenerico } from '../components/graficos/LineChartGenerico'
import { ScatterChartGenerico } from '../components/graficos/ScatterChartGenerico'
import type { Dashboard } from '../types/api'
import { formatoPesos } from '../utils/formato'

export function AnalisisExploratorio() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Dashboard>('/analisis/dashboard')
      .then((res) => setDashboard(res.data))
      .catch(() => setError('No se pudo cargar el análisis exploratorio.'))
  }, [])

  if (error) return <p className="mensaje-error">{error}</p>
  if (!dashboard) return <p>Cargando análisis...</p>

  const { metricas } = dashboard

  return (
    <div className="pantalla-analisis">
      <div className="metricas-fila">
        <div className="metrica tarjeta">
          <span className="metrica-label">Total de consultas</span>
          <span className="metrica-valor">{metricas.total_consultas.toLocaleString('es-AR')}</span>
        </div>
        <div className="metrica tarjeta">
          <span className="metrica-label">Precio de lista promedio</span>
          <span className="metrica-valor">{formatoPesos(metricas.precio_lista_promedio)}</span>
        </div>
        <div className="metrica tarjeta">
          <span className="metrica-label">Ahorro promedio</span>
          <span className="metrica-valor">{formatoPesos(metricas.ahorro_promedio)}</span>
        </div>
        <div className="metrica tarjeta">
          <span className="metrica-label">Consultas con stock crítico</span>
          <span className="metrica-valor">{metricas.consultas_stock_critico}</span>
        </div>
      </div>

      <div className="tarjeta">
        <h3>Top 15 obras sociales por volumen de consultas</h3>
        <BarChartGenerico
          datos={dashboard.top_obras_sociales.slice().reverse()}
          claveCategoria="categoria"
          claveValor="valor"
          vertical
          alto={420}
        />
        <p className="caption">Obras sociales prioritarias a la hora de negociar convenios.</p>
      </div>

      <div className="tarjeta">
        <h3>Top 10 productos más consultados</h3>
        <BarChartGenerico datos={dashboard.top_productos.slice().reverse()} claveCategoria="categoria" claveValor="valor" vertical alto={340} />
        <p className="caption">Qué productos mueven más volumen de mostrador.</p>
      </div>

      <div className="tarjeta">
        <h3>Consultas por día de la semana</h3>
        <BarChartGenerico datos={dashboard.consultas_por_dia} claveCategoria="categoria" claveValor="valor" />
        <p className="caption">Permite ver si hay días de mayor demanda para planificar la dotación de personal.</p>
      </div>

      <div className="tarjeta">
        <h3>Distribución del precio de lista</h3>
        <BarChartGenerico
          datos={dashboard.distribucion_precio_lista.map((b) => ({ rango: `${formatoPesos(b.desde)}`, cantidad: b.cantidad }))}
          claveCategoria="rango"
          claveValor="cantidad"
          colorBarra="#10b981"
        />
      </div>

      <div className="tarjeta">
        <h3>Stock promedio por categoría</h3>
        <BarChartGenerico datos={dashboard.stock_promedio_categoria} claveCategoria="categoria" claveValor="valor" colorBarra="#f97316" />
      </div>

      <div className="tarjeta">
        <h3>Productos con stock crítico</h3>
        <table className="tabla">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Stock disponible</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.stock_critico.map((fila, i) => (
              <tr key={i}>
                <td>{fila.producto_nombre}</td>
                <td>{fila.categoria}</td>
                <td>{fila.stock_disponible}</td>
                <td>{fila.fecha}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tarjeta">
        <h3>Precio de lista vs. precio final, según promoción bancaria</h3>
        <ScatterChartGenerico
          datos={dashboard.dispersion_precio}
          claveX="precio_lista"
          claveY="precio_final"
          claveGrupo="banco_promocion"
          nombreX="Precio de lista"
          nombreY="Precio final"
        />
      </div>

      <div className="tarjeta">
        <h3>Descuento acumulado promedio por día de la semana</h3>
        <LineChartGenerico
          datos={dashboard.descuento_por_dia}
          claveCategoria="categoria"
          claveValor="valor"
          formatoY={(v) => `${Math.round(v * 100)}%`}
        />
      </div>

      <div className="tarjeta">
        <h3>Distribución del precio de lista por categoría</h3>
        <BoxplotChart datos={dashboard.boxplot_categoria} />
      </div>

      <div className="tarjeta">
        <h3>Matriz de correlación de variables numéricas</h3>
        <GrillaCalor columnas={dashboard.correlacion.columnas} valores={dashboard.correlacion.valores} />
      </div>

      <div className="tarjeta">
        <h3>Proporción de consultas con/sin promoción bancaria</h3>
        <BarChartGenerico datos={dashboard.proporcion_con_promocion} claveCategoria="categoria" claveValor="valor" colorBarra="#a855f7" alto={220} />
      </div>
    </div>
  )
}
