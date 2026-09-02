import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface Props<T> {
  datos: T[]
  claveCategoria: keyof T & string
  claveValor: keyof T & string
  colorLinea?: string
  formatoY?: (valor: number) => string
}

export function LineChartGenerico<T>({ datos, claveCategoria, claveValor, colorLinea = '#3b82f6', formatoY }: Props<T>) {
  // ver comentario en BarChartGenerico: el tipado de dataKey de recharts no
  // unifica con el T de este wrapper genérico.
  const categoria = claveCategoria as never
  const valor = claveValor as never

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={datos} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={categoria} />
        <YAxis tickFormatter={formatoY} />
        <Tooltip formatter={formatoY ? (valor) => formatoY(Number(valor)) : undefined} />
        <Line type="monotone" dataKey={valor} stroke={colorLinea} strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
