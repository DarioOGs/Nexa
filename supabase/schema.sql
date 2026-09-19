-- ============================================================================
-- Nexa / VirtualZone — esquema inicial (Fase 9 del Documento Maestro)
-- Ejecutar en el SQL Editor de Supabase (proyecto nuevo, plan gratuito).
--
-- Si este esquema ya se corrió antes en tu proyecto, no lo vuelvas a correr
-- entero: mirá supabase/migrations/ y corré ahí solo los archivos nuevos
-- (son incrementales, uno por cada cambio posterior a este archivo).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla de perfiles (extiende auth.users con rol y nombre para mostrar)
--    El login de Supabase Auth usa email; en la UI el usuario ingresa un
--    "usuario_login" que se mapea a un email interno (<login>@nexa.local)
--    para no exigirle un correo real a la papelería.
-- ----------------------------------------------------------------------------
create type public.rol_usuario as enum ('administrador', 'empleado');

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  rol public.rol_usuario not null default 'empleado',
  usuario_login text not null unique,
  creado_en timestamptz not null default now()
);

comment on table public.perfiles is 'Datos de rol/negocio de cada usuario autenticado (Fase 9: Usuario).';

-- Helper: rol del usuario autenticado actual
create or replace function public.rol_actual()
returns public.rol_usuario
language sql
security definer
stable
set search_path = public
as $$
  select rol from public.perfiles where id = auth.uid();
$$;

create or replace function public.es_administrador()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select rol from public.perfiles where id = auth.uid()) = 'administrador', false);
$$;

-- ----------------------------------------------------------------------------
-- 2. Productos (inventario)
-- ----------------------------------------------------------------------------
create table public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(trim(nombre)) > 0),
  codigo text unique,
  cantidad_stock integer not null default 0 check (cantidad_stock >= 0),
  limite_minimo integer check (limite_minimo >= 0),
  valor_compra numeric(12, 2) not null default 0 check (valor_compra >= 0),
  valor numeric(12, 2) not null default 0 check (valor >= 0),
  imagen_url text,
  fecha_actualizacion timestamptz not null default now(),
  creado_en timestamptz not null default now()
);

create index productos_nombre_idx on public.productos using gin (to_tsvector('spanish', nombre));

create or replace function public.tocar_fecha_actualizacion()
returns trigger
language plpgsql
as $$
begin
  new.fecha_actualizacion := now();
  return new;
end;
$$;

create trigger productos_set_fecha_actualizacion
  before update on public.productos
  for each row execute function public.tocar_fecha_actualizacion();

-- ----------------------------------------------------------------------------
-- 3. Ventas y detalle de venta
-- ----------------------------------------------------------------------------
-- El id lo genera siempre el cliente (crypto.randomUUID()) en el momento de
-- confirmar la venta, incluso offline; sincronizar reintentando un upsert
-- por id es entonces idempotente y nunca duplica la venta (CU07/RF11).
create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles (id),
  fecha timestamptz not null default now(),
  metodo_pago text not null check (metodo_pago in ('efectivo', 'transferencia')),
  total numeric(12, 2) not null default 0 check (total >= 0)
);

create table public.detalle_venta (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas (id) on delete cascade,
  producto_id uuid not null references public.productos (id),
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(12, 2) not null check (precio_unitario >= 0),
  costo_unitario numeric(12, 2) not null default 0 check (costo_unitario >= 0),
  subtotal numeric(12, 2) generated always as (cantidad * precio_unitario) stored
);

-- Descuenta stock automáticamente al insertar una línea de venta (CU01).
-- Falla (y por lo tanto revierte toda la venta) si no hay stock suficiente,
-- cumpliendo la regla de "no inventario negativo".
create or replace function public.descontar_stock()
returns trigger
language plpgsql
as $$
declare
  stock_actual integer;
begin
  select cantidad_stock into stock_actual from public.productos where id = new.producto_id for update;

  if stock_actual is null then
    raise exception 'Producto % no existe', new.producto_id;
  end if;

  if stock_actual < new.cantidad then
    raise exception 'Stock insuficiente para el producto % (disponible: %, solicitado: %)',
      new.producto_id, stock_actual, new.cantidad;
  end if;

  update public.productos
    set cantidad_stock = cantidad_stock - new.cantidad
    where id = new.producto_id;

  return new;
end;
$$;

create trigger detalle_venta_descontar_stock
  after insert on public.detalle_venta
  for each row execute function public.descontar_stock();

-- ----------------------------------------------------------------------------
-- 4. Movimientos contables (ingresos / egresos) — RF06, RF07
-- ----------------------------------------------------------------------------
create table public.movimientos_contables (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles (id),
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  monto numeric(12, 2) not null check (monto > 0),
  descripcion text not null check (char_length(trim(descripcion)) > 0),
  fecha timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. Historial de movimientos (auditoría) — RF12, solo administradora
-- ----------------------------------------------------------------------------
create table public.historial_movimientos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.perfiles (id),
  accion text not null,
  detalle text,
  fecha timestamptz not null default now()
);

create or replace function public.registrar_historial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  accion_texto text;
  detalle_texto text;
begin
  if tg_op = 'INSERT' then
    accion_texto := 'creó ' || tg_table_name;
  elsif tg_op = 'UPDATE' then
    accion_texto := 'actualizó ' || tg_table_name;
  elsif tg_op = 'DELETE' then
    accion_texto := 'eliminó ' || tg_table_name;
  end if;

  if tg_table_name = 'productos' then
    detalle_texto := coalesce(new.nombre, old.nombre);
  elsif tg_table_name = 'ventas' then
    detalle_texto := 'venta ' || coalesce(new.id, old.id)::text || ' por ' || coalesce(new.total, old.total)::text;
  elsif tg_table_name = 'movimientos_contables' then
    detalle_texto := coalesce(new.tipo, old.tipo) || ' de ' || coalesce(new.monto, old.monto)::text || ': ' ||
                      coalesce(new.descripcion, old.descripcion);
  elsif tg_table_name = 'perfiles' then
    detalle_texto := coalesce(new.usuario_login, old.usuario_login) || ' (' || coalesce(new.rol, old.rol)::text || ')';
  end if;

  insert into public.historial_movimientos (usuario_id, accion, detalle)
  values (auth.uid(), accion_texto, detalle_texto);

  return coalesce(new, old);
end;
$$;

create trigger productos_historial
  after insert or update or delete on public.productos
  for each row execute function public.registrar_historial();

create trigger ventas_historial
  after insert on public.ventas
  for each row execute function public.registrar_historial();

create trigger movimientos_contables_historial
  after insert on public.movimientos_contables
  for each row execute function public.registrar_historial();

create trigger perfiles_historial
  after insert or update on public.perfiles
  for each row execute function public.registrar_historial();

-- ----------------------------------------------------------------------------
-- 6. Row Level Security — Fase 8 (reglas de negocio)
-- ----------------------------------------------------------------------------
alter table public.perfiles enable row level security;
alter table public.productos enable row level security;
alter table public.ventas enable row level security;
alter table public.detalle_venta enable row level security;
alter table public.movimientos_contables enable row level security;
alter table public.historial_movimientos enable row level security;

-- Perfiles: cualquier usuario autenticado puede leer todos los perfiles
-- (se necesita para mostrar nombres en ventas/historial); solo la
-- administradora puede crear o modificar usuarios.
create policy perfiles_select on public.perfiles
  for select to authenticated using (true);

create policy perfiles_insert_admin on public.perfiles
  for insert to authenticated with check (public.es_administrador());

create policy perfiles_update_admin on public.perfiles
  for update to authenticated using (public.es_administrador());

-- Productos: administradora y empleado tienen acceso completo (Fase 8).
create policy productos_select on public.productos
  for select to authenticated using (true);

create policy productos_insert on public.productos
  for insert to authenticated with check (true);

create policy productos_update on public.productos
  for update to authenticated using (true);

create policy productos_delete on public.productos
  for delete to authenticated using (true);

-- Ventas: ambos roles registran y ven ventas.
create policy ventas_select on public.ventas
  for select to authenticated using (true);

create policy ventas_insert on public.ventas
  for insert to authenticated with check (true);

create policy detalle_venta_select on public.detalle_venta
  for select to authenticated using (true);

create policy detalle_venta_insert on public.detalle_venta
  for insert to authenticated with check (true);

-- Contabilidad: solo administradora (Fase 8 / nav de Fase 10).
create policy movimientos_select_admin on public.movimientos_contables
  for select to authenticated using (public.es_administrador());

create policy movimientos_insert_admin on public.movimientos_contables
  for insert to authenticated with check (public.es_administrador());

-- Historial: solo administradora (RF12).
create policy historial_select_admin on public.historial_movimientos
  for select to authenticated using (public.es_administrador());

-- El insert al historial lo hace siempre la función SECURITY DEFINER de los
-- triggers, nunca el cliente directamente, así que no se necesita policy de
-- insert para 'authenticated'.

-- ----------------------------------------------------------------------------
-- 7. Storage: bucket de imágenes de producto (Supabase Storage, RF13)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;

create policy "Imagenes de productos: lectura publica"
  on storage.objects for select
  using (bucket_id = 'productos');

create policy "Imagenes de productos: escritura autenticados"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'productos');

create policy "Imagenes de productos: actualizacion autenticados"
  on storage.objects for update to authenticated
  using (bucket_id = 'productos');

-- ----------------------------------------------------------------------------
-- 8. Realtime: publicar las tablas que necesitan sincronización en vivo
--    entre dispositivos (RF10) además del bucket offline (RF11).
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.productos;
alter publication supabase_realtime add table public.ventas;
alter publication supabase_realtime add table public.detalle_venta;
alter publication supabase_realtime add table public.movimientos_contables;

-- ----------------------------------------------------------------------------
-- 9. Primer usuario administrador
--    Supabase Auth no permite crear filas en auth.users por SQL plano; crear
--    el primer usuario desde Authentication > Users en el dashboard (o con
--    supabase.auth.signUp desde la app) usando el email interno
--    "<usuario_login>@nexa.local", y luego insertar su perfil aquí:
--
--    insert into public.perfiles (id, nombre, rol, usuario_login)
--    values ('<uuid-del-usuario-creado>', 'Diana', 'administrador', 'diana');
-- ----------------------------------------------------------------------------
