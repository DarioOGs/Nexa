import { Printer } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatoMoneda, formatoFechaHora } from '@/lib/format'
import { datosNegocio } from '@/lib/negocio'
import type { ItemCarrito, MetodoPago } from '@/types'

export function Comprobante({
  fecha,
  metodoPago,
  items,
  total,
  vendedor,
  onCerrar,
}: {
  fecha: string
  metodoPago: MetodoPago
  items: ItemCarrito[]
  total: number
  vendedor: string
  onCerrar: () => void
}) {
  return (
    <Modal titulo="Comprobante de venta" onCerrar={onCerrar}>
      <div id="comprobante-imprimible" className="rounded-lg border border-border bg-white p-4 font-mono text-sm">
        <div className="mb-3 text-center">
          <p className="font-display text-lg font-semibold">{datosNegocio.nombre}</p>
          <p className="text-xs text-text-secondary">{datosNegocio.descripcion}</p>
          <p className="text-xs text-text-secondary">{datosNegocio.ubicacion}</p>
        </div>
        <div className="mb-2 border-t border-dashed border-border pt-2 text-xs">
          <p>{formatoFechaHora(fecha)}</p>
          <p>Atendido por: {vendedor}</p>
          <p>Pago: {metodoPago === 'efectivo' ? 'Efectivo' : 'Transferencia'}</p>
        </div>
        <div className="border-t border-dashed border-border py-2">
          {items.map((item) => (
            <div key={item.producto_id} className="mb-1 flex justify-between text-xs">
              <span>
                {item.cantidad}x {item.nombre}
              </span>
              <span>{formatoMoneda(item.cantidad * item.precio_unitario)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t border-dashed border-border pt-2 font-semibold">
          <span>Total</span>
          <span>{formatoMoneda(total)}</span>
        </div>
        <p className="mt-3 text-center text-[10px] text-text-secondary">
          Comprobante de venta interno — no reemplaza factura electrónica DIAN.
        </p>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variante="secondary" onClick={onCerrar}>
          Cerrar
        </Button>
        <Button onClick={() => window.print()}>
          <span className="flex items-center gap-1.5">
            <Printer size={16} /> Imprimir
          </span>
        </Button>
      </div>
    </Modal>
  )
}
