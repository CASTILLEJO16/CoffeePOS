import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, 
  Wallet, 
  ShoppingCart, 
  FileText, 
  Calendar, 
  Clock,
  DollarSign,
  ArrowLeft,
  Filter,
  Search
} from 'lucide-react';
import { getUserActivity } from '../services/userActivityService.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { formatBusinessDateTime } from '../utils/dateTime.js';
import { formatPaymentMethod } from '../utils/salesAnalytics.js';
import './UserActivity.css';

export default function UserActivity() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadActivity();
  }, [userId]);

  async function loadActivity() {
    try {
      setLoading(true);
      const response = await getUserActivity(userId);
      console.log('Respuesta de actividad:', response);

      // El backend envuelve los datos reales dentro de "data"
      // { success: true, data: { user, statistics, cashRegisters, sales, logs } }
      if (response?.success) {
        setActivity(response.data);
      } else {
        console.error('Respuesta no exitosa del servidor:', response);
        setActivity(null);
      }
    } catch (error) {
      console.error('Error al cargar actividad:', error);
      setActivity(null);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Formatea fecha en zona horaria America/Tijuana
   * Usa la utilidad central que ya maneja correctamente las fechas de SQLite (UTC).
   */
  function formatDate(dateString) {
    if (!dateString) return '—';
    return formatBusinessDateTime(dateString);
  }

  function getFilteredActivities() {
    if (!activity) return [];

    let activities = [];

    // Combinar todas las actividades con tipo
    activity.cashRegisters?.forEach(caja => {
      activities.push({
        type: 'caja',
        id: caja.id,
        fecha: caja.fecha_apertura,
        fechaCierre: caja.fecha_cierre,
        estado: caja.estado,
        nombre: caja.nombre_caja,
        monto: caja.fondo_inicial,
        detalles: `Apertura de caja: ${caja.nombre_caja}`,
        icon: Wallet,
        iconColor: caja.estado === 'abierta' ? '#4caf50' : '#1565c0'
      });
    });

    activity.sales?.forEach(venta => {
      activities.push({
        type: 'venta',
        id: venta.id,
        fecha: venta.fecha,
        estado: 'completada',
        nombre: `Venta #${venta.id}`,
        monto: venta.total,
        metodo: venta.metodo_pago,
        tipoTarjeta: venta.tipo_tarjeta,
        detalles: `Venta por ${formatCurrency(venta.total)} - ${formatPaymentMethod(venta.metodo_pago, venta.tipo_tarjeta)}`,
        icon: ShoppingCart,
        iconColor: '#8B4513'
      });
    });

    activity.logs?.forEach(log => {
      activities.push({
        type: 'log',
        id: log.id,
        fecha: log.fecha,
        estado: 'registrado',
        nombre: log.accion,
        detalles: log.detalles || log.accion,
        icon: FileText,
        iconColor: '#666'
      });
    });

    // Ordenar por fecha descendente SIN convertir zona (las fechas ya vienen en Tijuana)
    activities.sort((a, b) => {
      const fa = a.fecha || '';
      const fb = b.fecha || '';
      return fb.localeCompare(fa); // YYYY-MM-DD HH:mm:ss ordena correctamente como string
    });

    // Filtrar por tab
    if (activeTab !== 'all') {
      activities = activities.filter(act => act.type === activeTab);
    }

    // Filtrar por búsqueda
    if (searchTerm) {
      activities = activities.filter(act =>
        act.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        act.detalles?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return activities;
  }

  if (loading) {
    return (
      <div className="user-activity-page">
        <div className="loading">Cargando actividad del usuario...</div>
      </div>
    );
  }

  if (!activity || !activity.user) {
    return (
      <div className="user-activity-page">
        <div className="error">Error al cargar la actividad del usuario</div>
      </div>
    );
  }

  const filteredActivities = getFilteredActivities();

  return (
    <div className="admin-page user-activity-page">
      <div className="user-activity-container">
        <div className="activity-header">
          <button className="back-button" onClick={() => navigate('/admin/usuarios')}>
            <ArrowLeft size={20} />
            Volver
          </button>
          <div className="user-info">
            <User className="user-icon" size={48} />
            <div className="user-details">
              <h1 className="user-name">{activity.user.nombre}</h1>
              <p className="user-username">@{activity.user.usuario}</p>
              <span className={`role-badge ${activity.user.rol}`}>
                {activity.user.rol === 'admin' ? 'Administrador' : 'Vendedor'}
              </span>
            </div>
          </div>
        </div>

        <div className="statistics-grid">
          <div className="stat-card">
            <Wallet className="stat-icon" size={24} />
            <div className="stat-content">
              <span className="stat-value">{activity.statistics?.totalCajas ?? 0}</span>
              <span className="stat-label">Cajas</span>
            </div>
          </div>

          <div className="stat-card">
            <ShoppingCart className="stat-icon" size={24} />
            <div className="stat-content">
              <span className="stat-value">{activity.statistics?.totalVentas ?? 0}</span>
              <span className="stat-label">Ventas</span>
            </div>
          </div>

          <div className="stat-card">
            <DollarSign className="stat-icon" size={24} />
            <div className="stat-content">
              <span className="stat-value">{formatCurrency(activity.statistics?.totalVentasMonto ?? 0)}</span>
              <span className="stat-label">Total Ventas</span>
            </div>
          </div>

          <div className="stat-card">
            <FileText className="stat-icon" size={24} />
            <div className="stat-content">
              <span className="stat-value">{activity.statistics?.totalLogs ?? 0}</span>
              <span className="stat-label">Logs</span>
            </div>
          </div>
        </div>

        <div className="activity-controls">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Todo
            </button>
            <button
              className={`tab ${activeTab === 'caja' ? 'active' : ''}`}
              onClick={() => setActiveTab('caja')}
            >
              Cajas
            </button>
            <button
              className={`tab ${activeTab === 'venta' ? 'active' : ''}`}
              onClick={() => setActiveTab('venta')}
            >
              Ventas
            </button>
            <button
              className={`tab ${activeTab === 'log' ? 'active' : ''}`}
              onClick={() => setActiveTab('log')}
            >
              Logs
            </button>
          </div>

          <div className="search-wrapper">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar actividad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="activity-list">
          {filteredActivities.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <p>No hay actividades con los filtros actuales</p>
            </div>
          ) : (
            filteredActivities.map((activityItem) => (
              <div key={`${activityItem.type}-${activityItem.id}`} className="activity-item">
                <div className="activity-icon" style={{ color: activityItem.iconColor }}>
                  <activityItem.icon size={24} />
                </div>
                <div className="activity-content">
                  <div className="activity-header-row">
                    <h3 className="activity-title">{activityItem.nombre}</h3>
                    <span className={`activity-status ${activityItem.estado}`}>
                      {activityItem.estado}
                    </span>
                  </div>
                  <p className="activity-details">{activityItem.detalles}</p>
                  <div className="activity-meta">
                    <div className="meta-item">
                      <Calendar size={14} />
                      <span>{formatDate(activityItem.fecha)}</span>
                    </div>
                    {activityItem.monto !== undefined && (
                      <div className="meta-item">
                        <DollarSign size={14} />
                        <span>{formatCurrency(activityItem.monto)}</span>
                      </div>
                    )}
                    {activityItem.fechaCierre && (
                      <div className="meta-item">
                        <Clock size={14} />
                        <span>Cierre: {formatDate(activityItem.fechaCierre)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
