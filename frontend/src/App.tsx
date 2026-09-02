import { useState } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { Administracion } from './pages/Administracion'
import { AnalisisExploratorio } from './pages/AnalisisExploratorio'
import { ConsultaPrecio } from './pages/ConsultaPrecio'
import { Login } from './pages/Login'
import { AuthProvider, useAuth } from './context/AuthContext'

type Pestaña = 'consulta' | 'analisis' | 'administracion'

function PaginaPrincipal() {
  const { usuario, logout, cargando } = useAuth()
  const [pestaña, setPestaña] = useState<Pestaña>('consulta')

  if (cargando) return null

  return (
    <div className="app-shell">
      <header className="encabezado">
        <h1>💊 FarmaConsulta</h1>
        {usuario ? (
          <div className="sesion-info">
            <span>Sesión iniciada: {usuario.nombre_completo ?? usuario.username}</span>
            <button onClick={logout}>Cerrar sesión</button>
          </div>
        ) : (
          <Link className="link-personal" to="/login">
            Acceso personal de farmacia
          </Link>
        )}
      </header>

      {usuario && (
        <nav className="tabs">
          <button className={pestaña === 'consulta' ? 'tab activo' : 'tab'} onClick={() => setPestaña('consulta')}>
            Consulta de precio
          </button>
          <button className={pestaña === 'analisis' ? 'tab activo' : 'tab'} onClick={() => setPestaña('analisis')}>
            Análisis exploratorio
          </button>
          <button className={pestaña === 'administracion' ? 'tab activo' : 'tab'} onClick={() => setPestaña('administracion')}>
            Administración
          </button>
        </nav>
      )}

      <main>
        {!usuario && <ConsultaPrecio />}
        {usuario && pestaña === 'consulta' && <ConsultaPrecio />}
        {usuario && pestaña === 'analisis' && <AnalisisExploratorio />}
        {usuario && pestaña === 'administracion' && <Administracion />}
      </main>
    </div>
  )
}

function RutaLogin() {
  const { usuario, cargando } = useAuth()
  if (cargando) return null
  if (usuario) return <Navigate to="/" replace />
  return <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PaginaPrincipal />} />
          <Route path="/login" element={<RutaLogin />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
