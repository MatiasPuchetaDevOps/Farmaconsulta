interface Props {
  columnas: string[]
  valores: number[][]
}

// Va de rojo (-1) a blanco (0) a azul (+1), sin depender de ninguna librería extra
function colorParaValor(valor: number): string {
  const intensidad = Math.min(Math.abs(valor), 1)
  const alpha = 0.15 + intensidad * 0.75
  return valor >= 0 ? `rgba(59, 130, 246, ${alpha})` : `rgba(239, 68, 68, ${alpha})`
}

export function GrillaCalor({ columnas, valores }: Props) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 560 }}>
        <thead>
          <tr>
            <th></th>
            {columnas.map((col) => (
              <th key={col} style={{ padding: 6, fontSize: 12, textAlign: 'center' }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {valores.map((fila, i) => (
            <tr key={columnas[i]}>
              <td style={{ padding: 6, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{columnas[i]}</td>
              {fila.map((valor, j) => (
                <td
                  key={j}
                  style={{
                    padding: 8,
                    textAlign: 'center',
                    fontSize: 12,
                    backgroundColor: colorParaValor(valor),
                    border: '1px solid rgba(0,0,0,0.05)',
                  }}
                >
                  {valor.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
