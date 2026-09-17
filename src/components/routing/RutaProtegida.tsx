import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function RutaProtegida({ children, soloAdmin = false }: { children: ReactNode; soloAdmin?: boolean }) {
  const { sesion, perfil, cargando, esAdministrador } = useAuth()

  if (cargando) {
    return <div className="flex min-h-screen items-center justify-center text-text-secondary">Cargando…</div>
  }

  if (!sesion || !perfil) {
    return <Navigate to="/login" replace />
  }

  if (soloAdmin && !esAdministrador) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
