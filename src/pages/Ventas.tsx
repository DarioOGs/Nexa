import { useMemo, useState } from 'react'
import { Minus, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Comprobante } from '@/components/ventas/Comprobante'
import { useAuth } from '@/context/AuthContext'
import { useProductos } from '@/hooks/useProductos'
import { supabase } from '@/lib/supabase'
import { encolarVenta, actualizarStockCache } from '@/lib/offlineDb'
import { formatoMoneda } from '@/lib/format'
import type { ItemCarrito, MetodoPago } from '@/types'

export default function Ventas() {
  const { perfil } = useAuth()
  const { productos, recargar, enLinea } = useProductos()
  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [metodoPago, setMetodoPago] = useState<MetodoPago | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [comprobante, setComprobante] = useState<{
    fecha: string
    metodoPago: MetodoPago
    items: ItemCarrito[]
    total: number
    vendedor: string
  } | null>(null)

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return productos
    return productos.filter((p) => p.nombre.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q))
  }, [productos, busqueda])

  const total = carrito.reduce((acc, item) => acc + item.cantidad * item.precio_unitario, 0)

  function agregarAlCarrito(productoId: string) {
    setError(null)
    const producto = productos.find((p) => p.id === productoId)
    if (!producto) return

    setCarrito((actual) => {
      const existente = actual.find((i) => i.producto_id === productoId)
      const cantidadActual = existente?.cantidad ?? 0
      if (cantidadActual + 1 > producto.cantidad_stock) {
        setError(`No hay suficiente stock de "${producto.nombre}" (disponible: ${producto.cantidad_stock}).`)
        return actual
      }
      if (existente) {
        return actual.map((i) => (i.producto_id === productoId ? { ...i, cantidad: i.cantidad + 1 } : i))
      }
      return [
        ...actual,
        {
          producto_id: producto.id,
          nombre: producto.nombre,
          precio_unitario: producto.valor,
          costo_unitario: producto.valor_compra,
          cantidad: 1,
          stock_disponible: producto.cantidad_stock,
        },
      ]
    })
  }

  function cambiarCantidad(productoId: string, delta: number) {
    setError(null)
    setCarrito((actual) =>
      actual
        .map((item) => {
          if (item.producto_id !== productoId) return item
          const nuevaCantidad = item.cantidad + delta
          if (nuevaCantidad > item.stock_disponible) {
            setError(`No hay suficiente stock de "${item.nombre}" (disponible: ${item.stock_disponible}).`)
            return item
          }
          return { ...item, cantidad: nuevaCantidad }
        })
        .filter((item) => item.cantidad > 0),
    )
  }

  function quitarDelCarrito(productoId: string) {
    setCarrito((actual) => actual.filter((i) => i.producto_id !== productoId))
  }

  async function confirmarVenta() {
    if (!perfil) return
    if (carrito.length === 0) return
    if (!metodoPago) {
      setError('Elegí un método de pago para confirmar.')
      return
    }

    setError(null)
    setConfirmando(true)

    const ventaId = crypto.randomUUID()
    const fecha = new Date().toISOString()
    const items = carrito.map((item) => ({
      id: crypto.randomUUID(),
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      costo_unitario: item.costo_unitario,
    }))

    let sincronizada = false

    if (enLinea) {
      const { error: errorVenta } = await supabase
        .from('ventas')
        .insert({ id: ventaId, usuario_id: perfil.id, fecha, metodo_pago: metodoPago, total })

      if (!errorVenta) {
        const { error: errorDetalle } = await supabase
          .from('detalle_venta')
          .insert(items.map((i) => ({ ...i, venta_id: ventaId })))

        if (errorDetalle) {
          if (errorDetalle.message.toLowerCase().includes('stock insuficiente')) {
            setError('No se pudo confirmar: el stock cambió y ya no alcanza. Revisá el carrito.')
            setConfirmando(false)
            recargar()
            return
          }
        } else {
          sincronizada = true
        }
      }
    }

    if (!sincronizada) {
      // Sin conexión, o falló la llamada online por una caída de red:
      // se guarda localmente y se reintenta cuando vuelva la conexión (CU07).
      await encolarVenta({
        id: ventaId,
        usuario_id: perfil.id,
        fecha,
        metodo_pago: metodoPago,
        total,
        items,
        estado: 'pendiente',
      })
      for (const item of carrito) {
        await actualizarStockCache(item.producto_id, -item.cantidad)
      }
    }

    setComprobante({ fecha, metodoPago, items: carrito, total, vendedor: perfil.nombre })
    setCarrito([])
    setMetodoPago(null)
    setConfirmando(false)
    recargar()
  }

  return (
    <AppLayout titulo="Ventas">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto por nombre o código…"
              autoFocus
              className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-3 text-sm outline-none focus:border-accent"
            />
          </div>

          {productosFiltrados.length === 0 ? (
            <EmptyState titulo="Sin resultados" descripcion="Probá con otro nombre o código." />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {productosFiltrados.map((p) => {
                const agotado = p.cantidad_stock <= 0
                return (
                  <button
                    key={p.id}
                    onClick={() => agregarAlCarrito(p.id)}
                    disabled={agotado}
                    className="rounded-card border border-border bg-surface p-3 text-left transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="mb-2 flex h-20 items-center justify-center overflow-hidden rounded-lg bg-bg">
                      {p.imagen_url ? (
                        <img src={p.imagen_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ShoppingCart className="text-text-secondary" size={22} />
                      )}
                    </div>
                    <p className="truncate text-sm font-medium text-text-primary">{p.nombre}</p>
                    <p className="text-sm font-semibold text-accent">{formatoMoneda(p.valor)}</p>
                    <p className="text-xs text-text-secondary">{agotado ? 'Agotado' : `${p.cantidad_stock} disp.`}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <Card className="h-fit lg:sticky lg:top-6">
          <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">Carrito</h2>

          {carrito.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-secondary">Agregá productos tocándolos en la lista.</p>
          ) : (
            <ul className="mb-3 space-y-3">
              {carrito.map((item) => (
                <li key={item.producto_id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">{item.nombre}</p>
                    <p className="text-xs text-text-secondary">{formatoMoneda(item.cantidad * item.precio_unitario)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => cambiarCantidad(item.producto_id, -1)}
                      className="rounded-md border border-border p-1 text-text-secondary hover:border-accent"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-5 text-center text-sm">{item.cantidad}</span>
                    <button
                      onClick={() => cambiarCantidad(item.producto_id, 1)}
                      className="rounded-md border border-border p-1 text-text-secondary hover:border-accent"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => quitarDelCarrito(item.producto_id)}
                      className="ml-1 rounded-md p-1 text-text-secondary hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mb-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-semibold text-text-primary">Total</span>
            <span className="font-display text-xl font-semibold text-text-primary">{formatoMoneda(total)}</span>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            {(['efectivo', 'transferencia'] as MetodoPago[]).map((metodo) => (
              <button
                key={metodo}
                onClick={() => setMetodoPago(metodo)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition ${
                  metodoPago === metodo ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary'
                }`}
              >
                {metodo}
              </button>
            ))}
          </div>

          {error && <p className="mb-3 text-sm text-red-700">{error}</p>}

          <Button
            className="w-full"
            disabled={carrito.length === 0 || confirmando}
            onClick={confirmarVenta}
          >
            {confirmando ? 'Confirmando…' : 'Confirmar venta'}
          </Button>
        </Card>
      </div>

      {comprobante && (
        <Comprobante
          fecha={comprobante.fecha}
          metodoPago={comprobante.metodoPago}
          items={comprobante.items}
          total={comprobante.total}
          vendedor={comprobante.vendedor}
          onCerrar={() => setComprobante(null)}
        />
      )}
    </AppLayout>
  )
}
