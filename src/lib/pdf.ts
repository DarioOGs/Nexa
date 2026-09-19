import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { datosNegocio } from './negocio'
import { formatoMoneda, formatoFechaHora } from './format'
import type { MovimientoContable, VentaConDetalle } from '@/types'

const VERDE_ACENTO: [number, number, number] = [15, 110, 92]

interface ParametrosReporte {
  etiquetaPeriodo: string
  desde: string
  hasta: string
  ventas: VentaConDetalle[]
  movimientos: MovimientoContable[]
}

function finalYDe(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
}

export function generarReportePdf({ etiquetaPeriodo, desde, hasta, ventas, movimientos }: ParametrosReporte) {
  const doc = new jsPDF()

  const totalVentas = ventas.reduce((acc, v) => acc + Number(v.total), 0)
  const costoVentas = ventas.reduce(
    (acc, v) => acc + v.detalle_venta.reduce((a, d) => a + Number(d.costo_unitario) * d.cantidad, 0),
    0,
  )
  const gananciaVentas = totalVentas - costoVentas
  const ingresosVarios = movimientos.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + Number(m.monto), 0)
  const egresos = movimientos.filter((m) => m.tipo === 'egreso').reduce((a, m) => a + Number(m.monto), 0)
  const gananciaTotal = gananciaVentas + ingresosVarios - egresos

  const conteoProductos = new Map<string, { nombre: string; cantidad: number }>()
  for (const v of ventas) {
    for (const d of v.detalle_venta) {
      const nombre = d.productos?.nombre ?? 'Producto'
      const actual = conteoProductos.get(d.producto_id) ?? { nombre, cantidad: 0 }
      actual.cantidad += d.cantidad
      conteoProductos.set(d.producto_id, actual)
    }
  }
  const productoTop = [...conteoProductos.values()].sort((a, b) => b.cantidad - a.cantidad)[0]

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...VERDE_ACENTO)
  doc.text(`Nexa — Reporte del ${etiquetaPeriodo}`, 14, 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(90)
  doc.text(`${datosNegocio.nombre} · ${datosNegocio.ubicacion}`, 14, 25)
  doc.text(`Período: ${desde} a ${hasta}`, 14, 30)
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, 35)

  autoTable(doc, {
    startY: 42,
    theme: 'plain',
    styles: { fontSize: 10, textColor: 30 },
    body: [
      ['Vendido', formatoMoneda(totalVentas)],
      ['Cantidad de ventas', String(ventas.length)],
      ['Ganancia por ventas (precio - costo)', formatoMoneda(gananciaVentas)],
      ['Otros ingresos', formatoMoneda(ingresosVarios)],
      ['Egresos', formatoMoneda(egresos)],
      ['Ganancia neta del período', formatoMoneda(gananciaTotal)],
      ['Producto más vendido', productoTop ? `${productoTop.nombre} (${productoTop.cantidad} un.)` : '—'],
    ],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 85 } },
  })

  autoTable(doc, {
    startY: finalYDe(doc) + 10,
    head: [['Fecha', 'Vendedor', 'Productos', 'Pago', 'Total']],
    body: ventas.map((v) => [
      formatoFechaHora(v.fecha),
      v.perfiles?.nombre ?? '—',
      v.detalle_venta.map((d) => `${d.cantidad}x ${d.productos?.nombre ?? ''}`).join(', '),
      v.metodo_pago,
      formatoMoneda(v.total),
    ]),
    headStyles: { fillColor: VERDE_ACENTO },
    styles: { fontSize: 8 },
    columnStyles: { 2: { cellWidth: 68 } },
    margin: { bottom: 20 },
    didDrawPage: () => {
      doc.setFontSize(7)
      doc.setTextColor(150)
      doc.text('Nexa · VirtualZone', 14, doc.internal.pageSize.getHeight() - 10)
    },
  })

  if (movimientos.length > 0) {
    autoTable(doc, {
      startY: finalYDe(doc) + 10,
      head: [['Fecha', 'Tipo', 'Descripción', 'Monto']],
      body: movimientos.map((m) => [formatoFechaHora(m.fecha), m.tipo, m.descripcion, formatoMoneda(m.monto)]),
      headStyles: { fillColor: VERDE_ACENTO },
      styles: { fontSize: 8 },
    })
  }

  doc.save(`nexa-reporte-${desde}-a-${hasta}.pdf`)
}
