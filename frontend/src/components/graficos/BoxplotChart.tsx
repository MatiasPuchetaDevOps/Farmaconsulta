import { Bar, CartesianGrid, ComposedChart, ErrorBar, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import type { Cuartiles } from '../../types/api'

interface Props {
  datos: Cuartiles[]
}

// Recharts no trae boxplot nativo: la "caja" (Q1-Q3) se arma apilando una barra
// invisible (0 a Q1) debajo de la barra visible (Q1 a Q3), y los "bigotes"
// (min/max) se dibujan como ErrorBar sobre un punto ubicado en la mediana.
export function BoxplotChart({ datos }: Props) {
  const data = datos.map((d) => ({
    ...d,
    baseInvisible: d.q1,
    caja: d.q3 - d.q1,
    rango: [d.mediana - d.minimo, d.maximo - d.mediana] as [number, number],
  }))

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 48 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="categoria" angle={-30} textAnchor="end" interval={0} height={70} />
        <YAxis />
        <Tooltip />
        <Bar dataKey="baseInvisible" stackId="box" fill="transparent" />
        <Bar dataKey="caja" stackId="box" fill="#3b82f6" fillOpacity={0.5} stroke="#3b82f6" />
        <Scatter dataKey="mediana" fill="#1d4ed8">
          <ErrorBar dataKey="rango" width={6} strokeWidth={1.5} stroke="#1d4ed8" />
        </Scatter>
      </ComposedChart>
    </ResponsiveContainer>
  )
}
