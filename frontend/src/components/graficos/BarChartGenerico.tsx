import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface Props<T> {
  datos: T[]
  claveCategoria: keyof T & string
  claveValor: keyof T & string
  colorBarra?: string
  vertical?: boolean
  alto?: number
}

export function BarChartGenerico<T>({ datos, claveCategoria, claveValor, colorBarra = '#3b82f6', vertical = false, alto = 320 }: Props<T>) {
  // recharts tipa dataKey contra su propio genérico inferido de `data`, que no
  // unifica con el T de este wrapper: los props públicos (Props<T>) sí quedan
  // tipados, el `as string` de acá adentro es solo para la interop con la librería.
  const categoria = claveCategoria as never
  const valor = claveValor as never

  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart data={datos} layout={vertical ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 16, left: 8, bottom: vertical ? 8 : 48 }}>
        <CartesianGrid strokeDasharray="3 3" />
        {vertical ? (
          <>
            <XAxis type="number" />
            <YAxis type="category" dataKey={categoria} width={140} />
          </>
        ) : (
          <>
            <XAxis dataKey={categoria} angle={-30} textAnchor="end" interval={0} height={70} />
            <YAxis />
          </>
        )}
        <Tooltip />
        <Bar dataKey={valor} fill={colorBarra} />
      </BarChart>
    </ResponsiveContainer>
  )
}
