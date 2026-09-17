import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { MovimientoPendiente, Producto, VentaPendiente } from '@/types'

interface NexaDB extends DBSchema {
  productos: {
    key: string
    value: Producto
  }
  ventasPendientes: {
    key: string
    value: VentaPendiente
  }
  movimientosPendientes: {
    key: string
    value: MovimientoPendiente
  }
}

let dbPromise: Promise<IDBPDatabase<NexaDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<NexaDB>('nexa-offline', 1, {
      upgrade(db) {
        db.createObjectStore('productos', { keyPath: 'id' })
        db.createObjectStore('ventasPendientes', { keyPath: 'id' })
        db.createObjectStore('movimientosPendientes', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

// ---- Caché de productos (para poder vender y ver el inventario offline) ----

export async function cachearProductos(productos: Producto[]) {
  const db = await getDb()
  const tx = db.transaction('productos', 'readwrite')
  await tx.store.clear()
  await Promise.all(productos.map((p) => tx.store.put(p)))
  await tx.done
}

export async function leerProductosCache(): Promise<Producto[]> {
  const db = await getDb()
  return db.getAll('productos')
}

export async function actualizarStockCache(productoId: string, delta: number) {
  const db = await getDb()
  const producto = await db.get('productos', productoId)
  if (!producto) return
  producto.cantidad_stock = Math.max(0, producto.cantidad_stock + delta)
  await db.put('productos', producto)
}

// ---- Cola de ventas pendientes de sincronizar ----

export async function encolarVenta(venta: VentaPendiente) {
  const db = await getDb()
  await db.put('ventasPendientes', venta)
}

export async function leerVentasPendientes(): Promise<VentaPendiente[]> {
  const db = await getDb()
  return db.getAll('ventasPendientes')
}

export async function quitarVentaPendiente(id: string) {
  const db = await getDb()
  await db.delete('ventasPendientes', id)
}

export async function marcarVentaConflicto(id: string, error: string) {
  const db = await getDb()
  const venta = await db.get('ventasPendientes', id)
  if (!venta) return
  venta.estado = 'conflicto'
  venta.error = error
  await db.put('ventasPendientes', venta)
}

// ---- Cola de ingresos/egresos pendientes de sincronizar ----

export async function encolarMovimiento(mov: MovimientoPendiente) {
  const db = await getDb()
  await db.put('movimientosPendientes', mov)
}

export async function leerMovimientosPendientes(): Promise<MovimientoPendiente[]> {
  const db = await getDb()
  return db.getAll('movimientosPendientes')
}

export async function quitarMovimientoPendiente(id: string) {
  const db = await getDb()
  await db.delete('movimientosPendientes', id)
}

export async function marcarMovimientoConflicto(id: string, error: string) {
  const db = await getDb()
  const mov = await db.get('movimientosPendientes', id)
  if (!mov) return
  mov.estado = 'conflicto'
  mov.error = error
  await db.put('movimientosPendientes', mov)
}
