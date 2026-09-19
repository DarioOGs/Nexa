import { useEffect, useState } from 'react'
import { AlertTriangle, DollarSign, Printer, Receipt } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Comprobante } from '@/components/ventas/Comprobante'
import { supabase } from '@/lib/supabase'
import { formatoMoneda, formatoFechaHora } from '@/lib/format'
import { itemsDesdeVenta } from '@/lib/comprobante'
import { productoConStockBajo, useProductos } from '@/hooks/useProductos'
import type { VentaConDetalle } from '@/types'

export default function Inicio() {
  const { productos, enLinea } = useProductos()
  const [ventasHoy, setVentasHoy] = useState<VentaConDetalle[]>([])
  const [cargando, setCargando] = useState(true)
  const [reimprimir, setReimprimir] = useState<VentaConDetalle | null>(null)

  useEffect(() => {
    if (!enLinea) {
      setCargando(false)
      return
    }
    const inicioDelDia = new Date()
    inicioDelDia.setHours(0, 0, 0, 0)

    supabase
      .from('ventas')
      .select('*, detalle_venta(*, productos(nombre)), perfiles(nombre)')
      .gte('fecha', inicioDelDia.toISOString())
      .order('fecha', { ascending: false })
      .then(({ data }) => {
        setVentasHoy((data as VentaConDetalle[]) ?? [])
        setCargando(false)
      })
  }, [enLinea])

  const totalVendidoHoy = ventasHoy.reduce((acc, v) => acc + Number(v.total), 0)
  const stockBajo = productos.filter(productoConStockBajo)

  return (
    <AppLayout titulo="Inicio">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-accent/10 p-2 text-accent">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Vendido hoy</p>
              <p className="font-display text-2xl font-semibold text-text-primary">
                {enLinea ? formatoMoneda(totalVendidoHoy) : '—'}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-accent/10 p-2 text-accent">
              <Receipt size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Ventas hoy</p>
              <p className="font-display text-2xl font-semibold text-text-primary">
                {enLinea ? ventasHoy.length : '—'}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-alert-bg p-2 text-alert-text">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Stock bajo</p>
              <p className="font-display text-2xl font-semibold text-text-primary">{stockBajo.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {stockBajo.length > 0 && (
        <Card className="mt-4">
          <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">Productos por reponer</h2>
          <ul className="divide-y divide-border">
            {stockBajo.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span className="text-sm text-text-primary">{p.nombre}</span>
                <Badge variante="alerta">
                  {p.cantidad_stock} en stock (mínimo {p.limite_minimo})
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-4">
        <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">Últimas ventas</h2>
        {!enLinea ? (
          <EmptyState
            titulo="Sin conexión"
            descripcion="El resumen del día necesita internet. Las ventas que registres ahora se guardan y se muestran acá al sincronizar."
          />
        ) : cargando ? (
          <p className="text-sm text-text-secondary">Cargando…</p>
        ) : ventasHoy.length === 0 ? (
          <EmptyState titulo="Todavía no hay ventas hoy" />
        ) : (
          <ul className="divide-y divide-border">
            {ventasHoy.slice(0, 8).map((v) => (
              <li key={v.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="text-text-primary">
                    {v.detalle_venta.map((d) => d.productos?.nombre).filter(Boolean).join(', ') || 'Venta'}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {formatoFechaHora(v.fecha)} · {v.perfiles?.nombre ?? ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variante="neutral">{v.metodo_pago}</Badge>
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
