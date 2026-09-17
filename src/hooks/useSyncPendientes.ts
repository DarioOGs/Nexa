import { useCallback, useEffect, useState } from 'react'
import { leerMovimientosPendientes, leerVentasPendientes } from '@/lib/offlineDb'
import { sincronizarPendientes } from '@/lib/sync'
import { useOnlineStatus } from './useOnlineStatus'

export function useSyncPendientes() {
  const enLinea = useOnlineStatus()
  const [pendientes, setPendientes] = useState(0)
  const [conflictos, setConflictos] = useState(0)
  const [sincronizando, setSincronizando] = useState(false)

  const refrescarContadores = useCallback(async () => {
    const [ventas, movimientos] = await Promise.all([leerVentasPendientes(), leerMovimientosPendientes()])
    const todos = [...ventas, ...movimientos]
    setPendientes(todos.filter((x) => x.estado === 'pendiente').length)
    setConflictos(todos.filter((x) => x.estado === 'conflicto').length)
  }, [])

  const sincronizar = useCallback(async () => {
    setSincronizando(true)
    await sincronizarPendientes()
    await refrescarContadores()
    setSincronizando(false)
  }, [refrescarContadores])

  useEffect(() => {
    refrescarContadores()
  }, [refrescarContadores])

  useEffect(() => {
    if (enLinea) sincronizar()
    // Solo se dispara cuando cambia el estado de conexión, no en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enLinea])

  return { enLinea, pendientes, conflictos, sincronizando, sincronizar }
}
