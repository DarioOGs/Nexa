import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cachearProductos, leerProductosCache } from '@/lib/offlineDb'
import { useOnlineStatus } from './useOnlineStatus'
import type { Producto } from '@/types'

export function useProductos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const enLinea = useOnlineStatus()

  const cargar = useCallback(async () => {
    if (enLinea) {
      const { data, error } = await supabase.from('productos').select('*').order('nombre')
      if (!error && data) {
        setProductos(data)
        await cachearProductos(data)
        setCargando(false)
        return
      }
    }
    setProductos(await leerProductosCache())
    setCargando(false)
  }, [enLinea])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    if (!enLinea) return
    const canal = supabase
      .channel('productos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => cargar())
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [enLinea, cargar])

  return { productos, cargando, recargar: cargar, enLinea }
}

export function productoConStockBajo(p: Producto) {
  return p.limite_minimo != null && p.cantidad_stock <= p.limite_minimo
}
