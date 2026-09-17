import { NavLink } from 'react-router-dom'
import {
  ClipboardList,
  History,
  Home,
  Package,
  Receipt,
  ShoppingCart,
  Users,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const itemBase =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition text-[#CFE3DC]'
const itemActivo = 'bg-white/10 text-white'
const itemInactivo = 'hover:bg-white/5'

export function Sidebar() {
  const { esAdministrador } = useAuth()

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[240px] flex-col bg-sidebar px-3 py-6 md:flex">
      <div className="mb-8 px-3">
        <span className="font-display text-2xl font-semibold text-white">Nexa</span>
        <p className="text-xs text-[#8FA79E]">VirtualZone</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        <NavLink to="/" end className={({ isActive }) => `${itemBase} ${isActive ? itemActivo : itemInactivo}`}>
          <Home size={18} /> Inicio
        </NavLink>
        <NavLink to="/ventas" className={({ isActive }) => `${itemBase} ${isActive ? itemActivo : itemInactivo}`}>
          <ShoppingCart size={18} /> Ventas
        </NavLink>
        <NavLink to="/inventario" className={({ isActive }) => `${itemBase} ${isActive ? itemActivo : itemInactivo}`}>
          <Package size={18} /> Inventario
        </NavLink>

        {esAdministrador && (
          <>
            <div className="mt-4 mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-[#6E877E]">
              Administración
            </div>
            <NavLink
              to="/contabilidad"
              className={({ isActive }) => `${itemBase} ${isActive ? itemActivo : itemInactivo}`}
            >
              <Receipt size={18} /> Contabilidad
            </NavLink>
            <NavLink to="/reportes" className={({ isActive }) => `${itemBase} ${isActive ? itemActivo : itemInactivo}`}>
              <ClipboardList size={18} /> Reportes
            </NavLink>
            <NavLink to="/historial" className={({ isActive }) => `${itemBase} ${isActive ? itemActivo : itemInactivo}`}>
              <History size={18} /> Historial
            </NavLink>
            <NavLink to="/usuarios" className={({ isActive }) => `${itemBase} ${isActive ? itemActivo : itemInactivo}`}>
              <Users size={18} /> Usuarios
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  )
}
