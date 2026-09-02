export function formatoPesos(valor: number): string {
  return `$${Math.round(valor).toLocaleString('es-AR')}`
}

export function formatoPorcentaje(valor: number): string {
  return `${Math.round(valor * 100)}%`
}
