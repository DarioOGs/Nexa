# Nexa

App web (PWA) para gestionar inventario, ventas y contabilidad de negocios de
barrio. Construida primero para **VirtualZone**, la papelería piloto — ver el
`Documento Maestro del Proyecto` para el detalle de las 17 fases de análisis
que definieron este MVP.

## Stack

- **Frontend:** React + TypeScript + Vite, PWA (`vite-plugin-pwa`), Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Offline:** caché de inventario y cola de ventas/movimientos en IndexedDB
  (`src/lib/offlineDb.ts`), sincronizada automáticamente al recuperar
  conexión (`src/lib/sync.ts`)

## Puesta en marcha

### 1. Crear el proyecto en Supabase

1. Crear un proyecto nuevo (plan gratuito) en [supabase.com](https://supabase.com).
2. Abrir **SQL Editor** y ejecutar el contenido de `supabase/schema.sql`
   completo. Crea las tablas (Fase 9), las reglas de seguridad por rol
   (Fase 8), los triggers de descuento de stock y de historial de
   auditoría, y el bucket de Storage para las fotos de producto.
   Si el proyecto ya existía de antes (`schema.sql` ya corrido una vez),
   no lo repitas: en cambio corré, en orden, los archivos nuevos que haya
   en `supabase/migrations/` (cada uno se corre una sola vez).
3. Crear el primer usuario administrador:
   - En **Authentication → Users**, crear un usuario con email
     `<usuario>@nexa.local` (por ejemplo `diana@nexa.local`) y una
     contraseña.
   - En **SQL Editor**, insertar su perfil:
     ```sql
     insert into public.perfiles (id, nombre, rol, usuario_login)
     values ('<uuid del usuario creado>', 'Diana', 'administrador', 'diana');
     ```
4. (Opcional pero recomendado) Desplegar la Edge Function que permite crear
   y eliminar usuarios desde la pantalla **Usuarios** sin salir de la app:
   ```bash
   supabase functions deploy usuarios-admin --project-ref <tu-project-ref>
   ```
   Sin esto, el primer usuario (la administradora) igual puede entrar y usar
   todo el sistema; solo la gestión de altas/bajas de otros usuarios desde
   la UI necesita la función desplegada.

### 2. Configurar el frontend

```bash
cp .env.example .env.local
# completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
# (Project Settings → API en el dashboard de Supabase)

npm install
npm run dev
```

Para producción:

```bash
npm run build   # genera dist/
```

Desplegable directo en Vercel o Netlify (plan gratuito): conectar el
repositorio y configurar las mismas dos variables de entorno.

## Estructura

```
src/
  components/
    layout/       Sidebar, Topbar, AppLayout (estructura común, Fase 12)
    ui/            Card, Badge, Button, Modal — guía de estilo (Fase 13)
    ventas/         Comprobante de venta imprimible (CU02)
    routing/        Rutas protegidas por sesión y por rol
  context/          AuthContext (sesión + perfil + rol)
  hooks/            useProductos, useOnlineStatus, useSyncPendientes
  lib/
    supabase.ts     Cliente de Supabase
    offlineDb.ts    Caché de productos + colas offline (IndexedDB)
    sync.ts         Sincronización de ventas/movimientos pendientes
    format.ts        Formato de moneda y fechas (es-CO)
    negocio.ts        Datos de VirtualZone para el comprobante
  pages/            Una pantalla por sección de navegación (Fase 10)
  types/            Tipos que reflejan el modelo de datos (Fase 9)
supabase/
  schema.sql              Tablas, RLS, triggers, Storage (Fase 9 y 8)
  functions/usuarios-admin  Edge Function para alta/baja de usuarios (RF09)
```

## Cómo se cubren los requisitos clave

- **RF01–RF04, CU01–CU04** (inventario y ventas): `Inventario.tsx`,
  `Ventas.tsx`. El trigger `descontar_stock` en la base de datos impide que
  el stock quede negativo aunque dos dispositivos vendan al mismo tiempo.
- **RF06–RF08, CU05–CU06** (contabilidad y reportes): `Contabilidad.tsx`,
  `Reportes.tsx`, filtrable por día/semana/mes/año, con validación de rango
  de fechas.
- **RF09, RF12** (roles e historial): RLS en `schema.sql` restringe
  Contabilidad/Reportes/Historial/Usuarios a la administradora; el trigger
  `registrar_historial` audita cada alta/edición/baja con usuario y fecha.
- **RF10, RF11, CU07** (multi-dispositivo y offline): Supabase Realtime
  mantiene el inventario sincronizado entre dispositivos conectados; sin
  conexión, `useProductos` sirve desde la caché IndexedDB y las ventas se
  encolan con un id generado en el dispositivo, así el reintento de
  sincronización nunca duplica una venta. Un conflicto de stock al
  sincronizar se marca para revisión manual en vez de perder o sobrescribir
  la venta.
- **RF13**: subida de imagen de producto a Supabase Storage
  (`Inventario.tsx`).
- **Costo, % de ganancia y ganancia real** (pedido por Diana): en
  `Inventario.tsx` el costo de compra, el % de ganancia y el precio de
  venta están vinculados — completar dos calcula el tercero. Cada línea de
  venta guarda el costo del producto en ese momento
  (`detalle_venta.costo_unitario`), igual que ya hace con el precio, para
  que la ganancia de una venta pasada no cambie si el costo del producto se
  actualiza después.
- **Reporte en PDF** (pedido por Diana): botón "Descargar PDF" en
  `Reportes.tsx` (`src/lib/pdf.ts`, con jsPDF) — vendido, ganancia,
  producto más vendido y el detalle de ventas y movimientos del período
  elegido. La librería se carga solo al pedir el PDF (import dinámico) para
  no pesar en el resto de la app.
- **Reimprimir comprobante** (pedido por Diana): botón de reimprimir junto
  a cada venta en Inicio y en Reportes (`src/lib/comprobante.ts`
  reconstruye el comprobante desde la venta ya guardada en la base).

## Fuera de alcance de este MVP (Fase 3 del documento)

Pantalla de clientes finales, facturación electrónica DIAN, reportes
avanzados, IA y app móvil nativa — quedan para después de validar con
VirtualZone, según la visión del documento maestro.
