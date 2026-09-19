import { useEffect, useMemo, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Comprobante } from '@/components/ventas/Comprobante'
import { supabase } from '@/lib/supabase'
import { formatoMoneda, formatoFechaHora } from '@/lib/format'
import { itemsDesdeVenta } from '@/lib/comprobante'
import { productoConStockBajo, useProductos } from '@/hooks/useProductos'
import type { MovimientoContable, VentaConDetalle } from '@/types'

type Periodo = 'dia' | 'semana' | 'mes' | 'anio' | 'personalizado'

const ETIQUETAS_PERIODO: Record<Periodo, string> = {
  dia: 'día',
  semana: 'semana',
  mes: 'mes',
  anio: 'año',
  personalizado: 'período',
}

function rangoParaPeriodo(periodo: Periodo): { desde: string; hasta: string } {
  const hasta = new Date()
  const desde = new Date()
  if (periodo === 'dia') {
    desde.setHours(0, 0, 0, 0)
  } else if (periodo === 'semana') {
    desde.setDate(desde.getDate() - 7)
  } else if (periodo === 'mes') {
    desde.setMonth(desde.getMonth() - 1)
  } else if (periodo === 'anio') {
    desde.setFullYear(desde.getFullYear() - 1)
  }
  return { desde: desde.toISOString().slice(0, 10), hasta: hasta.toISOString().slice(0, 10) }
}

export default function Reportes() {
  const { productos } = useProductos()
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [desde, setDesde] = useState(() => rangoParaPeriodo('mes').desde)
  const [hasta, setHasta] = useState(() => rangoParaPeriodo('mes').hasta)
  const [ventas, setVentas] = useState<VentaConDetalle[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoContable[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reimprimir, setReimprimir] = useState<VentaConDetalle | null>(null)
  const [generandoPdf, setGenerandoPdf] = useState(false)

  function elegirPeriodo(p: Periodo) {
    setPeriodo(p)
    if (p !== 'personalizado') {
      const rango = rangoParaPeriodo(p)
      setDesde(rango.desde)
      setHasta(rango.hasta)
    }
  }

  useEffect(() => {
    if (new Date(hasta) < new Date(desde)) {
      setError('El rango de fechas no es válido: la fecha final es anterior a la inicial.')
      setVentas([])
      setMovimientos([])
      setCargando(false)
      return
    }
    setError(null)
    setCargando(true)

    const desdeIso = new Date(desde + 'T00:00:00').toISOString()
    const hastaIso = new Date(hasta + 'T23:59:59').toISOString()

    Promise.all([
      supabase
        .from('ventas')
        .select('*, detalle_venta(*, productos(nombre)), perfiles(nombre)')
        .gte('fecha', desdeIso)
        .lte('fecha', hastaIso)
        .order('fecha', { ascending: false }),
      supabase.from('movimientos_contables').select('*').gte('fecha', desdeIso).lte('fecha', hastaIso),
    ]).then(([{ data: v }, { data: m }]) => {
      setVentas((v as VentaConDetalle[]) ?? [])
      setMovimientos((m as MovimientoContable[]) ?? [])
      setCargando(false)
    })
  }, [desde, hasta])

  const totalVentas = ventas.reduce((acc, v) => acc + Number(v.total), 0)
  const costoVentas = ventas.reduce(
    (acc, v) => acc + v.detalle_venta.reduce((a, d) => a + Number(d.costo_unitario) * d.cantidad, 0),
    0,
  )
  const gananciaVentas = totalVentas - costoVentas
  const ingresosVarios = movimientos.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + Number(m.monto), 0)
  const egresos = movimientos.filter((m) => m.tipo === 'egreso').reduce((a, m) => a + Number(m.monto), 0)
  const gananciaTotal = gananciaVentas + ingresosVarios - egresos
  const stockBajo = useMemo(() => productos.filter(productoConStockBajo), [productos])

  const productoTop = useMemo(() => {
    const conteo = new Map<string, { nombre: string; cantidad: number }>()
    for (const v of ventas) {
      for (const d of v.detalle_venta) {
        const nombre = d.productos?.nombre ?? 'Producto'
        const actual = conteo.get(d.producto_id) ?? { nombre, cantidad: 0 }
        actual.cantidad += d.cantidad
        conteo.set(d.producto_id, actual)
      }
    }
    return [...conteo.values()].sort((a, b) => b.cantidad - a.cantidad)[0] ?? null
  }, [ventas])

  async function descargarPdf() {
    setGenerandoPdf(true)
    // Carga diferida: jsPDF pesa bastante y solo hace falta al pedir el PDF,
    // no en cada carga de la app (importa en el resto de la PWA, RNF01).
    const { generarReportePdf } = await import('@/lib/pdf')
    generarReportePdf({ etiquetaPeriodo: ETIQUETAS_PERIODO[periodo], desde, hasta, ventas, movimientos })
    setGenerandoPdf(false)
  }

  return (
    <AppLayout titulo="Reportes">
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['dia', 'Día'],
              ['semana', 'Semana'],
              ['mes', 'Mes'],
              ['anio', 'Año'],
            ] as [Periodo, string][]
          ).map(([valor, etiqueta]) => (
            <button
              key={valor}
              onClick={() => elegirPeriodo(valor)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                periodo === valor ? 'bg-accent text-white' : 'border border-border text-text-secondary'
              }`}
            >
              {etiqueta}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <input
              type="date"
              value={desde}
              onChange={(e) => {
                setPeriodo('personalizado')
                setDesde(e.target.value)
              }}
              className="campo w-auto"
            />
            <span className="text-text-secondary">→</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => {
                setPeriodo('personalizado')
                setHasta(e.target.value)
              }}
              className="campo w-auto"
            />
          </div>

          <Button variante="secondary" onClick={descargarPdf} disabled={cargando || generandoPdf || ventas.length === 0}>
            <span className="flex items-center gap-1.5">
              <Download size={16} /> {generandoPdf ? 'Generando…' : 'Descargar PDF'}
            </span>
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Vendido</p>
          <p className="font-display text-xl font-semibold text-text-primary">{formatoMoneda(totalVentas)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Ventas</p>
          <p className="font-display text-xl font-semibold text-text-primary">{ventas.length}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Ganancia neta</p>
          <p className="font-display text-xl font-semibold text-text-primary">{formatoMoneda(gananciaTotal)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Producto más vendido</p>
          <p className="truncate font-display text-xl font-semibold text-text-primary">
            {productoTop ? productoTop.nombre : '—'}
          </p>
          {productoTop && <p className="text-xs text-text-secondary">{productoTop.cantidad} unidades</p>}
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Otros ingresos</p>
          <p className="font-display text-xl font-semibold text-text-primary">{formatoMoneda(ingresosVarios)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Egresos</p>
          <p className="font-display text-xl font-semibold text-text-primary">{formatoMoneda(egresos)}</p>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="!p-0 overflow-hidden">
          <h2 className="px-5 pt-5 font-display text-lg font-semibold text-text-primary">Ventas del período</h2>
          {cargando ? (
            <p className="px-5 py-4 text-sm text-text-secondary">Cargando…</p>
          ) : ventas.length === 0 ? (
            <div className="p-5">
              <EmptyState titulo="Sin ventas en este período" />
            </div>
          ) : (
            <ul className="mt-2 max-h-96 divide-y divide-border overflow-y-auto">
              {ventas.map((v) => (
                <li key={v.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-text-primary">
                      {v.detalle_venta.map((d) => d.productos?.nombre).filter(Boolean).join(', ') || 'Venta'}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {formatoFechaHora(v.fecha)} · {v.perfiles?.nombre ?? ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-semibold text-text-primary">{formatoMoneda(v.total)}</span>
                    <button
                      onClick={() => setReimprimir(v)}
                      className="rounded-md p-1.5 text-text-secondary hover:text-accent"
                      title="Reimprimir comprobante"
                    >
                      <Printer size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="!p-0 overflow-hidden">
          <h2 className="px-5 pt-5 font-display text-lg font-semibold text-text-primary">Estado del inventario</h2>
          <p className="px-5 pt-1 text-xs text-text-secondary">Foto actual, no del período seleccionado.</p>
          <ul className="mt-2 max-h-96 divide-y divide-border overflow-y-auto">
            {productos.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <span className="text-text-primary">{p.nombre}</span>
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary">{p.cantidad_stock} un.</span>
                  {productoConStockBajo(p) && <Badge variante="alerta">Bajo</Badge>}
                </div>
              </li>
            ))}
          </ul>
          {stockBajo.length > 0 && (
            <p className="border-t border-border px-5 py-3 text-xs text-text-secondary">
              {stockBajo.length} producto(s) por debajo del mínimo.
            </p>
          )}
        </Card>
      </div>

      {reimprimir && (
        <Comprobante
          fecha={reimprimir.fecha}
          metodoPago={reimprimir.metodo_pago}
          items={itemsDesdeVenta(reimprimir)}
          total={reimprimir.total}
          vendedor={reimprimir.perfiles?.nombre ?? '—'}
          onCerrar={() => setReimprimir(null)}
        />
      )}
    </AppLayout>
  )
}
