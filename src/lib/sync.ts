import { supabase } from './supabase'
import {
  leerMovimientosPendientes,
  leerVentasPendientes,
  marcarMovimientoConflicto,
  marcarVentaConflicto,
  quitarMovimientoPendiente,
  quitarVentaPendiente,
} from './offlineDb'

export interface ResultadoSync {
  ventasSincronizadas: number
  movimientosSincronizados: number
  conflictos: number
}

/**
 * Sincroniza la cola de ventas y movimientos contables creados sin conexión
 * (CU07 / RF11). Cada registro usa un id generado en el dispositivo, así que
 * reintentar el upsert es seguro (idempotente) aunque la app se cierre a
 * mitad de la sincronización.
 */
export async function sincronizarPendientes(): Promise<ResultadoSync> {
  const resultado: ResultadoSync = { ventasSincronizadas: 0, movimientosSincronizados: 0, conflictos: 0 }

  const ventas = await leerVentasPendientes()
  for (const venta of ventas) {
    if (venta.estado === 'conflicto') continue
    try {
      const { error: errorVenta } = await supabase.from('ventas').upsert(
        {
          id: venta.id,
          usuario_id: venta.usuario_id,
          fecha: venta.fecha,
          metodo_pago: venta.metodo_pago,
          total: venta.total,
        },
        { onConflict: 'id' },
      )
      if (errorVenta) throw errorVenta

      const detalle = venta.items.map((item) => ({
        id: item.id,
        venta_id: venta.id,
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
      }))

      const { error: errorDetalle } = await supabase
        .from('detalle_venta')
        .upsert(detalle, { onConflict: 'id', ignoreDuplicates: true })
      if (errorDetalle) throw errorDetalle

      await quitarVentaPendiente(venta.id)
      resultado.ventasSincronizadas++
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : String(err)
      await marcarVentaConflicto(venta.id, mensaje)
      resultado.conflictos++
    }
  }

  const movimientos = await leerMovimientosPendientes()
  for (const mov of movimientos) {
    if (mov.estado === 'conflicto') continue
    try {
      const { error } = await supabase.from('movimientos_contables').upsert(
        {
          id: mov.id,
          usuario_id: mov.usuario_id,
          tipo: mov.tipo,
          monto: mov.monto,
          descripcion: mov.descripcion,
          fecha: mov.fecha,
        },
        { onConflict: 'id' },
      )
      if (error) throw error

      await quitarMovimientoPendiente(mov.id)
      resultado.movimientosSincronizados++
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : String(err)
      await marcarMovimientoConflicto(mov.id, mensaje)
      resultado.conflictos++
    }
  }

  return resultado
}
