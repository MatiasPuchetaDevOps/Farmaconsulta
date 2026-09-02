import { CartesianGrid, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'

interface Props<T> {
  datos: T[]
  claveX: keyof T & string
  claveY: keyof T & string
  claveGrupo: keyof T & string
  nombreX: string
  nombreY: string
}

const PALETA = ['#3b82f6', '#f97316', '#10b981', '#a855f7', '#ef4444', '#06b6d4', '#eab308']

export function ScatterChartGenerico<T>({ datos, claveX, claveY, claveGrupo, nombreX, nombreY }: Props<T>) {
  const grupos = Array.from(new Set(datos.map((d) => String(d[claveGrupo]))))
  // ver comentario en BarChartGenerico: el tipado de dataKey de recharts no
  // unifica con el T de este wrapper genérico.
  const x = claveX as never
  const y = claveY as never

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" dataKey={x} name={nombreX} />
        <YAxis type="number" dataKey={y} name={nombreY} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Legend />
        {grupos.map((grupo, i) => (
          <Scatter
            key={grupo}
            name={grupo}
            data={datos.filter((d) => String(d[claveGrupo]) === grupo)}
            fill={PALETA[i % PALETA.length]}
            opacity={0.7}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  )
}
