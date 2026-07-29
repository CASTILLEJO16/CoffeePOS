import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { ShoppingCart, Package, Settings, Users, DollarSign, LogOut, Coffee, Sun, Moon, Wallet } from 'lucide-react';
import Swal from 'sweetalert2';
import './AdminSidebar.css';

const menuItems = [
  { path: '/admin/pos',              icon: ShoppingCart, label: 'Punto de Venta' },
  { path: '/admin/apertura-caja',    icon: Wallet, label: 'Apertura de Caja' },
  { path: '/admin',                  icon: Package, label: 'Productos',      exact: true },
  { path: '/admin/personalizaciones',icon: Settings, label: 'Personalizaciones' },
  { path: '/admin/usuarios',         icon: Users, label: 'Usuarios' },
  { path: '/admin/ventas',           icon: DollarSign, label: 'Ventas' },
  { path: '/admin/almacen',          icon: Package, label: 'Almacén' },
  { path: '/admin/cortes-caja',      icon: Wallet, label: 'Cortes de Caja' },
  { path: '/admin/configuracion',    icon: Settings, label: 'Configuración' },
];

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  function handleLogout() {
    Swal.fire({
      title: '¿Estás seguro de cerrar sesión?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff4b4b',
      cancelButtonColor: '#888',
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        logout();
        navigate('/login');
      }
    });
  }

  function isActive(item) {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  }

  return (
    <aside className="admin-sidebar">
      {/* Logo */}
      <div className="sidebar-brand">
        <Coffee className="sidebar-brand-icon" size={24} />
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">Coffee POS</span>
          <span className="sidebar-brand-role">Panel Admin</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <p className="sidebar-section-label">MENÚ PRINCIPAL</p>
        {menuItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-link ${isActive(item) ? 'active' : ''}`}
          >
            <item.icon className="sidebar-icon" size={18} />
            <span className="sidebar-label">{item.label}</span>
            {isActive(item) && <span className="sidebar-active-dot" />}
          </Link>
        ))}
      </nav>

      {/* Footer con info del usuario */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.nombre?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.nombre || 'Administrador'}</span>
            <span className="sidebar-user-role">Administrador</span>
          </div>
        </div>
        <div className="sidebar-actions">
          <button 
            className="sidebar-action-btn" 
            onClick={toggleTheme} 
            title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button 
            className="sidebar-action-btn sidebar-logout-btn" 
            onClick={handleLogout} 
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}