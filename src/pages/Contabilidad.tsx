import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Scale } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/context/AuthContext'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { supabase } from '@/lib/supabase'
import { encolarMovimiento } from '@/lib/offlineDb'
import { formatoMoneda, formatoFechaHora } from '@/lib/format'
import type { MovimientoContable, TipoMovimiento } from '@/types'

export default function Contabilidad() {
  const { perfil } = useAuth()
  const enLinea = useOnlineStatus()
  const [movimientos, setMovimientos] = useState<MovimientoContable[]>([])
  const [totalVentasMes, setTotalVentasMes] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [tipo, setTipo] = useState<TipoMovimiento>('egreso')
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    setCargando(true)
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    const [{ data: movs }, { data: ventasMes }] = await Promise.all([
      supabase.from('movimientos_contables').select('*').order('fecha', { ascending: false }).limit(50),
      supabase.from('ventas').select('total').gte('fecha', inicioMes.toISOString()),
    ])

    setMovimientos((movs as MovimientoContable[]) ?? [])
    setTotalVentasMes((ventasMes ?? []).reduce((acc, v) => acc + Number(v.total), 0))
    setCargando(false)
  }

  useEffect(() => {
    if (enLinea) cargar()
    else setCargando(false)
  }, [enLinea])

  const ingresosVarios = movimientos.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + Number(m.monto), 0)
  const egresos = movimientos.filter((m) => m.tipo === 'egreso').reduce((a, m) => a + Number(m.monto), 0)
  const ingresosTotales = totalVentasMes + ingresosVarios
  const balance = ingresosTotales - egresos

  async function registrarMovimiento(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const montoNum = Number(monto)
    if (!montoNum || montoNum <= 0) {
      setError('Ingresá un monto válido.')
      return
    }
    if (!descripcion.trim()) {
      setError('Agregá una descripción.')
      return
    }

    setGuardando(true)
    const id = crypto.randomUUID()
    const fecha = new Date().toISOString()
    const payload = { id, usuario_id: perfil!.id, tipo, monto: montoNum, descripcion: descripcion.trim(), fecha }

    let sincronizado = false
    if (enLinea) {
      const { error } = await supabase.from('movimientos_contables').insert(payload)
      sincronizado = !error
    }
    if (!sincronizado) {
      await encolarMovimiento({ ...payload, estado: 'pendiente' })
    }

    setMonto('')
    setDescripcion('')
    setGuardando(false)
    if (enLinea) cargar()
  }

  return (
    <AppLayout titulo="Contabilidad">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-accent/10 p-2 text-accent">
              <ArrowUpCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Ingresos del mes</p>
              <p className="font-display text-xl font-semibold text-text-primary">{formatoMoneda(ingresosTotales)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-alert-bg p-2 text-alert-text">
              <ArrowDownCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Egresos del mes</p>
              <p className="font-display text-xl font-semibold text-text-primary">{formatoMoneda(egresos)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-accent/10 p-2 text-accent">
              <Scale size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Balance del mes</p>
              <p className="font-display text-xl font-semibold text-text-primary">{formatoMoneda(balance)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">Registrar movimiento</h2>
          <form onSubmit={registrarMovimiento} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {(['ingreso', 'egreso'] as TipoMovimiento[]).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition ${
                    tipo === t ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">Monto</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="campo"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Descripción
              </span>
              <input className="campo" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required />
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <Button type="submit" disabled={guardando} className="w-full">
              {guardando ? 'Guardando…' : 'Registrar'}
            </Button>
          </form>
        </Card>

        <Card className="!p-0 overflow-hidden">
          <h2 className="px-5 pt-5 font-display text-lg font-semibold text-text-primary">Movimientos recientes</h2>
          {!enLinea ? (
            <div className="p-5">
              <EmptyState titulo="Sin conexión" descripcion="Los movimientos que registres se sincronizarán al volver la conexión." />
            </div>
          ) : cargando ? (
            <p className="px-5 pb-5 pt-3 text-sm text-text-secondary">Cargando…</p>
          ) : movimientos.length === 0 ? (
            <div className="p-5">
              <EmptyState titulo="Todavía no hay movimientos" />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {movimientos.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <p className="text-text-primary">{m.descripcion}</p>
                    <p className="text-xs text-text-secondary">{formatoFechaHora(m.fecha)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variante={m.tipo === 'ingreso' ? 'exito' : 'alerta'}>{m.tipo}</Badge>
                    <span className="font-semibold text-text-primary">{formatoMoneda(m.monto)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppLayout>
  )
}
