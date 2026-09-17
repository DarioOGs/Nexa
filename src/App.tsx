import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { RutaProtegida } from '@/components/routing/RutaProtegida'
import Login from '@/pages/Login'
import Inicio from '@/pages/Inicio'
import Ventas from '@/pages/Ventas'
import Inventario from '@/pages/Inventario'
import Contabilidad from '@/pages/Contabilidad'
import Reportes from '@/pages/Reportes'
import Historial from '@/pages/Historial'
import Usuarios from '@/pages/Usuarios'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RutaProtegida>
                <Inicio />
              </RutaProtegida>
            }
          />
          <Route
            path="/ventas"
            element={
              <RutaProtegida>
                <Ventas />
              </RutaProtegida>
            }
          />
          <Route
            path="/inventario"
            element={
              <RutaProtegida>
                <Inventario />
              </RutaProtegida>
            }
          />
          <Route
            path="/contabilidad"
            element={
              <RutaProtegida soloAdmin>
                <Contabilidad />
              </RutaProtegida>
            }
          />
          <Route
            path="/reportes"
            element={
              <RutaProtegida soloAdmin>
                <Reportes />
              </RutaProtegida>
            }
          />
          <Route
            path="/historial"
            element={
              <RutaProtegida soloAdmin>
                <Historial />
              </RutaProtegida>
            }
          />
          <Route
            path="/usuarios"
            element={
              <RutaProtegida soloAdmin>
                <Usuarios />
              </RutaProtegida>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
