const formateadorCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function formatoMoneda(valor: number) {
  return formateadorCOP.format(valor)
}

export function formatoFechaHora(fechaIso: string) {
  return new Date(fechaIso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatoFecha(fechaIso: string) {
  return new Date(fechaIso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}
