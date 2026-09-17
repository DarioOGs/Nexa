// Edge Function: usuarios-admin
//
// Crea o elimina usuarios (Fase 8: solo la administradora puede hacerlo).
// El cliente (anon key) no tiene permiso para tocar auth.users directamente,
// así que esta función usa la service role key —solo disponible en el
// servidor de Supabase, nunca en el bundle del frontend— y primero verifica
// que quien llama sea realmente un administrador autenticado.
//
// Desplegar con:
//   supabase functions deploy usuarios-admin
//
// Requiere las variables de entorno estándar de Supabase (SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY), ya disponibles en el
// entorno de las Edge Functions sin configuración extra.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function respuesta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return respuesta({ error: 'No autenticado' }, 401)

  // Cliente "como el usuario que llama", solo para validar su sesión y rol.
  const clienteLlamador = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
  } = await clienteLlamador.auth.getUser()
  if (!user) return respuesta({ error: 'No autenticado' }, 401)

  const clienteAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: perfilLlamador } = await clienteAdmin
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfilLlamador?.rol !== 'administrador') {
    return respuesta({ error: 'Solo la administradora puede gestionar usuarios' }, 403)
  }

  const body = await req.json()

  if (body.accion === 'crear') {
    const { nombre, usuario_login, contrasena, rol } = body
    if (!nombre || !usuario_login || !contrasena || !rol) {
      return respuesta({ error: 'Faltan datos' }, 400)
    }

    const email = `${String(usuario_login).trim().toLowerCase()}@nexa.local`
    const { data: nuevoUsuario, error: errorCreacion } = await clienteAdmin.auth.admin.createUser({
      email,
      password: contrasena,
      email_confirm: true,
    })
    if (errorCreacion) return respuesta({ error: errorCreacion.message }, 400)

    const { error: errorPerfil } = await clienteAdmin.from('perfiles').insert({
      id: nuevoUsuario.user.id,
      nombre,
      usuario_login: String(usuario_login).trim().toLowerCase(),
      rol,
    })
    if (errorPerfil) {
      await clienteAdmin.auth.admin.deleteUser(nuevoUsuario.user.id)
      return respuesta({ error: errorPerfil.message }, 400)
    }

    return respuesta({ ok: true, id: nuevoUsuario.user.id })
  }

  if (body.accion === 'eliminar') {
    const { id } = body
    if (!id) return respuesta({ error: 'Falta el id' }, 400)
    if (id === user.id) return respuesta({ error: 'No podés eliminar tu propia cuenta' }, 400)

    const { error } = await clienteAdmin.auth.admin.deleteUser(id)
    if (error) return respuesta({ error: error.message }, 400)
    return respuesta({ ok: true })
  }

  return respuesta({ error: 'Acción no reconocida' }, 400)
})
