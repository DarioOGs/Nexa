import type { ItemCarrito, VentaConDetalle } from '@/types'

/** Reconstruye los ítems del comprobante a partir de una venta ya guardada, para poder reimprimirla (CU02). */
export function itemsDesdeVenta(venta: VentaConDetalle): ItemCarrito[] {
  return venta.detalle_venta.map((d) => ({
    producto_id: d.producto_id,
    nombre: d.productos?.nombre ?? 'Producto',
    precio_unitario: Number(d.precio_unitario),
    costo_unitario: Number(d.costo_unitario),
    cantidad: d.cantidad,
    stock_disponible: 0,
  }))
}
