import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { openCashRegister, getCashRegisterNames } from '../services/cashRegisterService.js';
import { formatBusinessDate, formatBusinessTime } from '../utils/dateTime.js';
import { Coffee, Clock, Calendar, User, DollarSign, FileText, Wallet } from 'lucide-react';
import Swal from 'sweetalert2';
import './AperturaCaja.css';

export default function AperturaCaja() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.rol === 'admin' || user?.role === 'admin';
  // El vendedor vuelve al POS de vendedor ("/"), el admin al POS de admin.
  const destinoPostApertura = isAdmin ? '/admin/pos' : '/';

  const [currentTime, setCurrentTime] = useState(new Date());
  const [formData, setFormData] = useState({
    nombre_caja: '',
    fondo_inicial: '',
    observaciones: ''
  });
  const [cajas, setCajas] = useState([]);
  const [cajasEnUso, setCajasEnUso] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    async function fetchCajas() {
      try {
        const data = await getCashRegisterNames();
        setCajas(data || []);

        // Obtener cajas abiertas para bloquear en UI
        const abiertas = await fetchOpenCajas();
        setCajasEnUso(new Set(abiertas));
      } catch (err) {
        console.error("Error al cargar cajas", err);
      }
    }
    fetchCajas();

    return () => clearInterval(timer);
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  async function fetchOpenCajas() {
    try {
      const res = await fetch('/api/cajas?estado=abierta');
      const json = await res.json();
      return (json.data || []).map(c => c.nombre_caja);
    } catch {
      return [];
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const fondoInicial = parseFloat(formData.fondo_inicial) || 0;
    const nombreCaja = formData.nombre_caja || `Caja ${user?.nombre}`;

    const result = await Swal.fire({
      title: '¿Abrir caja?',
      text: `¿Estás seguro de abrir la caja "${nombreCaja}" con un fondo inicial de $${fondoInicial.toFixed(2)}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, abrir',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    setLoading(true);

    try {
      await openCashRegister({
        nombre_caja: nombreCaja,
        fondo_inicial: fondoInicial,
        observaciones: formData.observaciones
      });

      await Swal.fire({
        title: '¡Caja Abierta!',
        text: 'La caja ha sido abierta correctamente',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });

      navigate(destinoPostApertura, { replace: true });
    } catch (err) {
      const message = err.response?.data?.error || 'Error al abrir la caja';

      // Si ya hay caja abierta, ir directo al POS correspondiente
      if (message.toLowerCase().includes('ya tiene una caja abierta')) {
        navigate(destinoPostApertura, { replace: true });
        return;
      }

      setError(message);
      setLoading(false);
      Swal.fire('Error', message, 'error');
    }
  }

  return (
    <div className="apertura-caja-page">
      <div className="apertura-caja-container">
        <div className="apertura-caja-header">
          <Coffee className="header-coffee-icon" size={48} strokeWidth={1.75} />
          <h1 className="apertura-title">Apertura de Caja</h1>
          <p className="apertura-subtitle">Registre el fondo inicial para comenzar su turno</p>
        </div>

        <div className="apertura-info-grid">
          <div className="info-card">
            <Calendar className="info-icon" size={20} />
            <div className="info-content">
              <span className="info-label">Fecha</span>
              <span className="info-value">{formatBusinessDate(currentTime)}</span>
            </div>
          </div>

          <div className="info-card">
            <Clock className="info-icon" size={20} />
            <div className="info-content">
              <span className="info-label">Hora (Tijuana)</span>
              <span className="info-value">{formatBusinessTime(currentTime)}</span>
            </div>
          </div>

          <div className="info-card">
            <User className="info-icon" size={20} />
            <div className="info-content">
              <span className="info-label">Vendedor</span>
              <span className="info-value">{user?.nombre}</span>
            </div>
          </div>
        </div>

        <form className="apertura-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <Wallet size={18} />
              Nombre de la Caja
            </label>
            {cajas.length > 0 ? (
              <select
                name="nombre_caja"
                className="form-input"
                value={formData.nombre_caja}
                onChange={handleChange}
                required
              >
                <option value="">Seleccione una caja...</option>
                {cajas.map(c => (
                  <option
                    key={c.id}
                    value={c.nombre}
                    disabled={cajasEnUso.has(c.nombre)}
                  >
                    {c.nombre} {cajasEnUso.has(c.nombre) ? '(En uso)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                name="nombre_caja"
                className="form-input"
                placeholder="Ej: Caja Principal, Caja 1, etc."
                value={formData.nombre_caja}
                onChange={handleChange}
                required
              />
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              <DollarSign size={18} />
              Fondo Inicial (Efectivo)
            </label>
            <div className="currency-input-wrapper">
              <span className="currency-symbol">$</span>
              <input
                type="number"
                name="fondo_inicial"
                className="form-input currency-input"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={formData.fondo_inicial}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <FileText size={18} />
              Observaciones (Opcional)
            </label>
            <textarea
              name="observaciones"
              className="form-textarea"
              placeholder="Notas adicionales sobre la apertura..."
              rows="3"
              value={formData.observaciones}
              onChange={handleChange}
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Abriendo caja...' : 'Abrir Caja'}
          </button>
        </form>
      </div>
    </div>
  );
}
