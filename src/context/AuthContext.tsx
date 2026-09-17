import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { loginAEmail, supabase } from '@/lib/supabase'
import type { Perfil } from '@/types'

interface AuthContextValue {
  sesion: Session | null
  perfil: Perfil | null
  cargando: boolean
  esAdministrador: boolean
  iniciarSesion: (usuarioLogin: string, contrasena: string) => Promise<{ error: string | null }>
  cerrarSesion: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [cargando, setCargando] = useState(true)

  async function cargarPerfil(userId: string) {
    const { data } = await supabase.from('perfiles').select('*').eq('id', userId).single()
    setPerfil(data as Perfil | null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      if (data.session) {
        cargarPerfil(data.session.user.id).finally(() => setCargando(false))
      } else {
        setCargando(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion)
      if (nuevaSesion) {
        cargarPerfil(nuevaSesion.user.id)
      } else {
        setPerfil(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function iniciarSesion(usuarioLogin: string, contrasena: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: loginAEmail(usuarioLogin),
      password: contrasena,
    })
    if (error) {
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        return { error: 'Usuario o contraseña incorrectos.' }
      }
      if (error.message.toLowerCase().includes('failed to fetch')) {
        return { error: 'Sin conexión: para iniciar sesión por primera vez en este dispositivo se necesita internet.' }
      }
      return { error: error.message }
    }
    return { error: null }
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        sesion,
        perfil,
        cargando,
        esAdministrador: perfil?.rol === 'administrador',
        iniciarSesion,
        cerrarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
