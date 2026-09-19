-- ============================================================================
-- Nexa — migración 0002: costo de compra, % de ganancia y costo por línea
-- de venta (para poder calcular ganancia real en los reportes).
--
-- Ejecutar una sola vez en el SQL Editor de Supabase, en un proyecto que ya
-- tenga corrido supabase/schema.sql. Es segura de reintentar (usa
-- "if not exists").
-- ============================================================================

alter table public.productos
  add column if not exists valor_compra numeric(12, 2) not null default 0 check (valor_compra >= 0);

comment on column public.productos.valor_compra is
  'Costo al que se compró el producto. El % de ganancia y el precio de venta (valor) se calculan a partir de este valor en la UI.';

-- Cada línea de venta guarda el costo del producto en ese momento (igual que
-- ya hace con precio_unitario), para que la ganancia de una venta pasada no
-- cambie si después se actualiza el costo del producto en el inventario.
alter table public.detalle_venta
  add column if not exists costo_unitario numeric(12, 2) not null default 0 check (costo_unitario >= 0);

comment on column public.detalle_venta.costo_unitario is
  'Costo del producto al momento de la venta (snapshot, igual que precio_unitario).';
