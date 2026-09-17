import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { supabase } from '@/lib/supabase'
import { formatoFechaHora } from '@/lib/format'
import type { HistorialMovimiento } from '@/types'

export default function Historial() {
  const [eventos, setEventos] = useState<HistorialMovimiento[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase
      .from('historial_movimientos')
      .select('*, perfiles(nombre)')
      .order('fecha', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setEventos((data as HistorialMovimiento[]) ?? [])
        setCargando(false)
      })
  }, [])

  return (
    <AppLayout titulo="Historial de movimientos">
      <Card className="!p-0 overflow-hidden">
        {cargando ? (
          <p className="p-6 text-sm text-text-secondary">Cargando…</p>
        ) : eventos.length === 0 ? (
          <div className="p-6">
            <EmptyState titulo="Sin actividad registrada todavía" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Usuario</th>
                <th className="px-5 py-3">Acción</th>
                <th className="px-5 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-5 py-3 text-text-secondary">{formatoFechaHora(e.fecha)}</td>
                  <td className="px-5 py-3 text-text-primary">{e.perfiles?.nombre ?? '—'}</td>
                  <td className="px-5 py-3 capitalize text-text-primary">{e.accion}</td>
                  <td className="px-5 py-3 text-text-secondary">{e.detalle ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </AppLayout>
  )
}
