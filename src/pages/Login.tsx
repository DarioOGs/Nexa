import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabaseConfigurado } from '@/lib/supabase'

export default function Login() {
  const { iniciarSesion } = useAuth()
  const navigate = useNavigate()
  const [usuarioLogin, setUsuarioLogin] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function manejarSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    const { error } = await iniciarSesion(usuarioLogin, contrasena)
    setEnviando(false)
    if (error) {
      setError(error)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-semibold text-text-primary">Nexa</h1>
          <p className="mt-1 text-sm text-text-secondary">VirtualZone · inventario, ventas y contabilidad</p>
        </div>

        <form onSubmit={manejarSubmit} className="rounded-card border border-border bg-surface p-6 shadow-sm">
          {!supabaseConfigurado && (
            <p className="mb-4 rounded-lg bg-alert-bg px-3 py-2 text-xs text-alert-text">
              Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local.
            </p>
          )}

          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Usuario
            </span>
            <input
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-text-primary outline-none focus:border-accent"
              value={usuarioLogin}
              onChange={(e) => setUsuarioLogin(e.target.value)}
              autoFocus
              autoComplete="username"
              required
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Contraseña
            </span>
            <input
              type="password"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-text-primary outline-none focus:border-accent"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-accent px-4 py-2.5 font-semibold text-white transition hover:bg-accent-dark disabled:opacity-60"
          >
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
