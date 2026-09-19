export type Rol = 'administrador' | 'empleado'

export interface Perfil {
  id: string
  nombre: string
  rol: Rol
  usuario_login: string
  creado_en: string
}

export interface Producto {
  id: string
  nombre: string
  codigo: string | null
  cantidad_stock: number
  limite_minimo: number | null
  valor_compra: number
  valor: number
  imagen_url: string | null
  fecha_actualizacion: string
  creado_en: string
}

export type MetodoPago = 'efectivo' | 'transferencia'

export interface Venta {
  id: string
  usuario_id: string
  fecha: string
  metodo_pago: MetodoPago
  total: number
}

export interface DetalleVenta {
  id: string
  venta_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
  costo_unitario: number
  subtotal: number
}

export interface VentaConDetalle extends Venta {
  detalle_venta: (DetalleVenta & { productos: Pick<Producto, 'nombre'> | null })[]
  perfiles?: Pick<Perfil, 'nombre'> | null
}

export type TipoMovimiento = 'ingreso' | 'egreso'

export interface MovimientoContable {
  id: string
  usuario_id: string
  tipo: TipoMovimiento
  monto: number
  descripcion: string
  fecha: string
}

export interface HistorialMovimiento {
  id: string
  usuario_id: string | null
  accion: string
  detalle: string | null
  fecha: string
  perfiles?: Pick<Perfil, 'nombre'> | null
}

export interface ItemCarrito {
  producto_id: string
  nombre: string
  precio_unitario: number
  costo_unitario: number
  cantidad: number
  stock_disponible: number
}

export interface VentaPendiente {
  id: string
  usuario_id: string
  fecha: string
  metodo_pago: MetodoPago
  total: number
  items: {
    id: string
    producto_id: string
    cantidad: number
    precio_unitario: number
    costo_unitario: number
  }[]
  estado: 'pendiente' | 'conflicto'
  error?: string
}

export interface MovimientoPendiente {
  id: string
  usuario_id: string
  tipo: TipoMovimiento
  monto: number
  descripcion: string
  fecha: string
  estado: 'pendiente' | 'conflicto'
  error?: string
}
