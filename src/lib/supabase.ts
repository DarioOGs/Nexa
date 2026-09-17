import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigurado = Boolean(url && anonKey)

if (!supabaseConfigurado) {
  console.warn(
    '[Nexa] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copiá .env.example a .env.local y completá los datos del proyecto Supabase.',
  )
}

// Con las variables vacías el cliente igual se instancia (para no romper el
// arranque de la app); las llamadas fallarán con un error claro hasta que se
// configuren las credenciales.
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder')

/** Convierte el usuario_login (ej. "diana") en el email interno usado por Supabase Auth. */
export function loginAEmail(usuarioLogin: string): string {
  return `${usuarioLogin.trim().toLowerCase()}@nexa.local`
}
