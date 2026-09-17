import { useEffect, useState } from 'react'
import { AlertCircle, LogOut, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSyncPendientes } from '@/hooks/useSyncPendientes'

export function Topbar({ titulo }: { titulo: string }) {
  const { perfil, cerrarSesion } = useAuth()
  const { enLinea, pendientes, conflictos, sincronizando, sincronizar } = useSyncPendientes()
  const [ahora, setAhora] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">{titulo}</h1>
        <p className="text-xs text-text-secondary">
          {ahora.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
          {ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {conflictos > 0 && (
          <span
            className="flex items-center gap-1.5 rounded-full bg-alert-bg px-2.5 py-1 text-xs font-semibold text-alert-text"
            title="Ventas o movimientos que no se pudieron sincronizar automáticamente"
          >
            <AlertCircle size={14} />
            {conflictos} con conflicto
          </span>
        )}

        {pendientes > 0 && (
          <button
            onClick={sincronizar}
            disabled={!enLinea || sincronizando}
            className="flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent disabled:opacity-60"
            title="Ventas guardadas sin conexión, pendientes de sincronizar"
          >
            <RefreshCw size={14} className={sincronizando ? 'animate-spin' : ''} />
            {pendientes} pendiente{pendientes === 1 ? '' : 's'}
          </button>
        )}

        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            enLinea ? 'bg-accent/10 text-accent' : 'bg-alert-bg text-alert-text'
          }`}
          title={enLinea ? 'Conectado' : 'Sin conexión — las ventas se guardan localmente'}
        >
          {enLinea ? <Wifi size={14} /> : <WifiOff size={14} />}
          {enLinea ? 'En línea' : 'Sin conexión'}
        </span>

        <div className="text-right">
          <p className="text-sm font-semibold text-text-primary">{perfil?.nombre ?? '—'}</p>
          <p className="text-xs capitalize text-text-secondary">{perfil?.rol}</p>
        </div>

        <button
          onClick={cerrarSesion}
          className="rounded-lg p-2 text-text-secondary hover:bg-bg hover:text-text-primary"
          title="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
