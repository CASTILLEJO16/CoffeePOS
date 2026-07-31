import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { OrderProvider } from './context/OrderContext.jsx';
import { AdminOrderProvider } from './context/AdminOrderContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import Login from './pages/Login.jsx';
import POS from './pages/POS.jsx';
import AdminPOS from './pages/AdminPOS.jsx';
import Admin from './pages/Admin.jsx';
import AdminCustomizations from './pages/AdminCustomizations.jsx';
import Usuarios from './pages/Usuarios.jsx';
import UserActivity from './pages/UserActivity.jsx';
import Ventas from './pages/Ventas.jsx';
import VentasVendedor from './pages/VentasVendedor.jsx';
import Configuracion from './pages/Configuracion.jsx';
import AdminAlmacen from './pages/AdminAlmacen.jsx';
import VendedorAlmacen from './pages/VendedorAlmacen.jsx';
import AperturaCaja from './pages/AperturaCaja.jsx';
import CierreCaja from './pages/CierreCaja.jsx';
import CortesCaja from './pages/CortesCaja.jsx';
import CashRegisterCheck from './components/CashRegisterCheck.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import './styles/global.css';
import ErrorBoundary from './components/ErrorBoundary.jsx';

function ProtectedRoute({ children, allowAdmin = false }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div className="loading-screen">Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si el usuario es admin y no se permite acceso admin, redirigir a su panel
  if (!allowAdmin && (user?.rol === 'admin' || user?.role === 'admin')) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div className="loading-screen">Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin' && user?.rol !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const isElectron = typeof window !== 'undefined' && window.location.protocol === 'file:';
  const Router = isElectron ? HashRouter : BrowserRouter;
  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
          <Router>
            <Routes>
            <Route path="/login" element={<Login />} />

            {/* Ruta de apertura de caja (SIN CashRegisterCheck) */}
            <Route
              path="/apertura-caja"
              element={
                <ProtectedRoute allowAdmin={true}>
                  <MainLayout>
                    <AperturaCaja />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Rutas para vendedores - Solo POS, con su propio carrito */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <OrderProvider>
                    <CashRegisterCheck>
                      <MainLayout />
                    </CashRegisterCheck>
                  </OrderProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<POS />} />
              <Route path="ventas" element={<VentasVendedor />} />
              <Route path="almacen" element={<VendedorAlmacen />} />
              <Route path="cierre-caja/:id" element={<CierreCaja />} />
            </Route>

            {/* Rutas para admin - Con sidebar completa y carrito AISLADO del vendedor */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminOrderProvider>
                    <AdminLayout />
                  </AdminOrderProvider>
                </AdminRoute>
              }
            >
              <Route index element={<Admin />} />
              <Route
                path="pos"
                element={
                  <CashRegisterCheck redirectPath="/apertura-caja">
                    <AdminPOS />
                  </CashRegisterCheck>
                }
              />
              <Route path="apertura-caja" element={<MainLayout><AperturaCaja /></MainLayout>} />
              {/* ✅ Permitir cierre de caja en admin usando la misma pantalla */}
              <Route path="cierre-caja/:id" element={<CierreCaja />} />
              <Route path="personalizaciones" element={<AdminCustomizations />} />
              <Route path="usuarios" element={<Usuarios />} />
              <Route path="usuarios/:userId" element={<UserActivity />} />
              <Route path="ventas" element={<Ventas />} />
              <Route path="almacen" element={<AdminAlmacen />} />
              <Route path="cortes-caja" element={<CortesCaja />} />
              <Route path="configuracion" element={<Configuracion />} />
            </Route>
            </Routes>
          </Router>
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
