import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Trash2, UserRound } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Perfil, Rol } from '@/types'

export default function Usuarios() {
  const { perfil: perfilActual } = useAuth()
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)

  async function cargar() {
    setCargando(true)
    const { data } = await supabase.from('perfiles').select('*').order('nombre')
    setPerfiles((data as Perfil[]) ?? [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  async function eliminar(usuario: Perfil) {
    if (usuario.id === perfilActual?.id) return
    if (!confirm(`¿Eliminar a ${usuario.nombre}? Ya no va a poder iniciar sesión.`)) return

    const { data: sesion } = await supabase.auth.getSession()
    const { error } = await supabase.functions.invoke('usuarios-admin', {
      body: { accion: 'eliminar', id: usuario.id },
      headers: { Authorization: `Bearer ${sesion.session?.access_token}` },
    })
    if (error) {
      alert('No se pudo eliminar: ' + error.message)
      return
    }
    cargar()
  }

  return (
    <AppLayout titulo="Usuarios y permisos">
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setMostrarForm(true)}>
          <span className="flex items-center gap-1.5">
            <Plus size={16} /> Nuevo usuario
          </span>
        </Button>
      </div>

      <Card className="!p-0 overflow-hidden">
        {cargando ? (
          <p className="p-6 text-sm text-text-secondary">Cargando…</p>
        ) : (
          <ul className="divide-y divide-border">
            {perfiles.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg text-text-secondary">
                    <UserRound size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{u.nombre}</p>
                    <p className="text-xs text-text-secondary">@{u.usuario_login}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variante={u.rol === 'administrador' ? 'accent' : 'neutral'}>{u.rol}</Badge>
                  {u.id !== perfilActual?.id && (
                    <button
                      onClick={() => eliminar(u)}
                      className="rounded-md p-1.5 text-text-secondary hover:text-red-600"
                      title="Eliminar usuario"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {mostrarForm && (
        <FormularioUsuario
          onCerrar={() => setMostrarForm(false)}
          onCreado={() => {
            setMostrarForm(false)
            cargar()
          }}
        />
      )}
    </AppLayout>
  )
}

function FormularioUsuario({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: () => void }) {
  const [nombre, setNombre] = useState('')
  const [usuarioLogin, setUsuarioLogin] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [rol, setRol] = useState<Rol>('empleado')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function manejarSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (contrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setGuardando(true)
    const { data: sesion } = await supabase.auth.getSession()
    const { error } = await supabase.functions.invoke('usuarios-admin', {
      body: { accion: 'crear', nombre, usuario_login: usuarioLogin, contrasena, rol },
      headers: { Authorization: `Bearer ${sesion.session?.access_token}` },
    })
    setGuardando(false)

    if (error) {
      setError(error.message)
      return
    }
    onCreado()
  }

  return (
    <Modal titulo="Nuevo usuario" onCerrar={onCerrar}>
      <form onSubmit={manejarSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">Nombre</span>
          <input className="campo" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Usuario (para iniciar sesión)
          </span>
          <input className="campo" value={usuarioLogin} onChange={(e) => setUsuarioLogin(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Contraseña
          </span>
          <input
            type="password"
            className="campo"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['empleado', 'administrador'] as Rol[]).map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => setRol(r)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition ${
                rol === r ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={guardando} className="w-full">
          {guardando ? 'Creando…' : 'Crear usuario'}
        </Button>
      </form>
    </Modal>
  )
}
