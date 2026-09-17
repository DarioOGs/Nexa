import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { ImagePlus, Plus, Search, Trash2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { supabase } from '@/lib/supabase'
import { formatoMoneda } from '@/lib/format'
import { productoConStockBajo, useProductos } from '@/hooks/useProductos'
import type { Producto } from '@/types'

interface FormState {
  nombre: string
  codigo: string
  cantidad_stock: string
  limite_minimo: string
  valor: string
  imagen_url: string | null
}

const formVacio: FormState = {
  nombre: '',
  codigo: '',
  cantidad_stock: '0',
  limite_minimo: '',
  valor: '0',
  imagen_url: null,
}

export default function Inventario() {
  const { productos, cargando, recargar, enLinea } = useProductos()
  const [busqueda, setBusqueda] = useState('')
  const [productoEditando, setProductoEditando] = useState<Producto | 'nuevo' | null>(null)

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return productos
    return productos.filter((p) => p.nombre.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q))
  }, [productos, busqueda])

  return (
    <AppLayout titulo="Inventario">
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código…"
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-10 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <Button onClick={() => setProductoEditando('nuevo')} disabled={!enLinea}>
          <span className="flex items-center gap-1.5">
            <Plus size={16} /> Agregar producto
          </span>
        </Button>
      </div>

      {!enLinea && (
        <p className="mb-4 rounded-lg bg-alert-bg px-3 py-2 text-xs text-alert-text">
          Sin conexión: podés ver el inventario, pero agregar o editar productos necesita internet.
        </p>
      )}

      <Card className="overflow-hidden !p-0">
        {cargando ? (
          <p className="p-6 text-sm text-text-secondary">Cargando…</p>
        ) : productosFiltrados.length === 0 ? (
          <div className="p-6">
            <EmptyState titulo="No hay productos" descripcion="Agregá el primer producto del inventario." />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <th className="px-5 py-3">Producto</th>
                <th className="px-5 py-3">Stock</th>
                <th className="px-5 py-3">Mínimo</th>
                <th className="px-5 py-3">Precio</th>
                <th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => enLinea && setProductoEditando(p)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-bg"
                >
                  <td className="flex items-center gap-3 px-5 py-3">
                    {p.imagen_url ? (
                      <img src={p.imagen_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg text-text-secondary">
                        <ImagePlus size={16} />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-text-primary">{p.nombre}</p>
                      {p.codigo && <p className="text-xs text-text-secondary">{p.codigo}</p>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-text-primary">{p.cantidad_stock}</td>
                  <td className="px-5 py-3 text-text-secondary">{p.limite_minimo ?? '—'}</td>
                  <td className="px-5 py-3 text-text-primary">{formatoMoneda(p.valor)}</td>
                  <td className="px-5 py-3">
                    {productoConStockBajo(p) ? (
                      <Badge variante="alerta">Stock bajo</Badge>
                    ) : (
                      <Badge variante="exito">Normal</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {productoEditando && (
        <FormularioProducto
          producto={productoEditando === 'nuevo' ? null : productoEditando}
          onCerrar={() => setProductoEditando(null)}
          onGuardado={() => {
            setProductoEditando(null)
            recargar()
          }}
        />
      )}
    </AppLayout>
  )
}

function FormularioProducto({
  producto,
  onCerrar,
  onGuardado,
}: {
  producto: Producto | null
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [form, setForm] = useState<FormState>(
    producto
      ? {
          nombre: producto.nombre,
          codigo: producto.codigo ?? '',
          cantidad_stock: String(producto.cantidad_stock),
          limite_minimo: producto.limite_minimo != null ? String(producto.limite_minimo) : '',
          valor: String(producto.valor),
          imagen_url: producto.imagen_url,
        }
      : formVacio,
  )
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function subirImagen(archivo: File) {
    setSubiendoImagen(true)
    setError(null)
    const ruta = `${crypto.randomUUID()}-${archivo.name}`
    const { error } = await supabase.storage.from('productos').upload(ruta, archivo, { upsert: false })
    setSubiendoImagen(false)
    if (error) {
      setError('No se pudo subir la imagen: ' + error.message)
      return
    }
    const { data } = supabase.storage.from('productos').getPublicUrl(ruta)
    setForm((f) => ({ ...f, imagen_url: data.publicUrl }))
  }

  async function manejarSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const nombre = form.nombre.trim()
    const cantidad = Number(form.cantidad_stock)
    const valor = Number(form.valor)
    const limite = form.limite_minimo.trim() === '' ? null : Number(form.limite_minimo)

    if (!nombre) {
      setError('El nombre es obligatorio.')
      return
    }
    if (cantidad < 0 || Number.isNaN(cantidad)) {
      setError('La cantidad no puede ser negativa.')
      return
    }

    setGuardando(true)
    const payload = {
      nombre,
      codigo: form.codigo.trim() || null,
      cantidad_stock: cantidad,
      limite_minimo: limite,
      valor: Number.isNaN(valor) ? 0 : valor,
      imagen_url: form.imagen_url,
    }

    const { error } = producto
      ? await supabase.from('productos').update(payload).eq('id', producto.id)
      : await supabase.from('productos').insert(payload)

    setGuardando(false)
    if (error) {
      setError(error.message)
      return
    }
    onGuardado()
  }

  async function eliminar() {
    if (!producto) return
    if (!confirm(`¿Eliminar "${producto.nombre}" del inventario?`)) return
    setGuardando(true)
    const { error } = await supabase.from('productos').delete().eq('id', producto.id)
    setGuardando(false)
    if (error) {
      setError(error.message)
      return
    }
    onGuardado()
  }

  return (
    <Modal titulo={producto ? 'Editar producto' : 'Agregar producto'} onCerrar={onCerrar}>
      <form onSubmit={manejarSubmit} className="space-y-3">
        <div className="flex items-center gap-4">
          <label className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-bg text-text-secondary">
            {form.imagen_url ? (
              <img src={form.imagen_url} alt="" className="h-full w-full object-cover" />
            ) : subiendoImagen ? (
              <span className="text-xs">…</span>
            ) : (
              <ImagePlus size={20} />
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && subirImagen(e.target.files[0])}
            />
          </label>
          <p className="text-xs text-text-secondary">Foto del producto (opcional). Se guarda en Supabase Storage.</p>
        </div>

        <Campo etiqueta="Nombre">
          <input
            className="campo"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            required
          />
        </Campo>

        <Campo etiqueta="Código (opcional)">
          <input
            className="campo"
            value={form.codigo}
            onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
          />
        </Campo>

        <div className="grid grid-cols-3 gap-3">
          <Campo etiqueta="Cantidad">
            <input
              type="number"
              min={0}
              className="campo"
              value={form.cantidad_stock}
              onChange={(e) => setForm((f) => ({ ...f, cantidad_stock: e.target.value }))}
              required
            />
          </Campo>
          <Campo etiqueta="Mínimo">
            <input
              type="number"
              min={0}
              className="campo"
              value={form.limite_minimo}
              onChange={(e) => setForm((f) => ({ ...f, limite_minimo: e.target.value }))}
              placeholder="—"
            />
          </Campo>
          <Campo etiqueta="Precio">
            <input
              type="number"
              min={0}
              step="0.01"
              className="campo"
              value={form.valor}
              onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
              required
            />
          </Campo>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {producto ? (
            <Button type="button" variante="danger" onClick={eliminar} disabled={guardando}>
              <span className="flex items-center gap-1.5">
                <Trash2 size={16} /> Eliminar
              </span>
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={guardando || subiendoImagen}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">{etiqueta}</span>
      {children}
    </label>
  )
}
