import { useState, useEffect } from 'react';
import { Settings, Save, Plus, Trash2, Wallet } from 'lucide-react';
import { getAllConfig, updateConfig } from '../../services/configService.js';
import { getCashRegisterNames, createCashRegisterName } from '../../services/cashRegisterService.js';
import Swal from 'sweetalert2';
import './AdminConfiguracion.css';

export default function AdminConfiguracion() {
  const [config, setConfig] = useState({ permitir_stock_negativo: '0', tipo_cambio_dolar: '20.00' });
  const [cajas, setCajas] = useState([]);
  const [cajasEnUso, setCajasEnUso] = useState(new Map()); // nombre -> { usuario, fecha }
  const [nuevaCaja, setNuevaCaja] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadOpenCajas, 5000);
    const alertInterval = setInterval(checkLongOpenAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const configData = await getAllConfig();
      const cajasData = await getCashRegisterNames();
      await loadOpenCajas();
      
      setConfig(prev => ({ ...prev, ...configData }));
      setCajas(cajasData || []);
    } catch (error) {
      console.error('Error loading config:', error);
      Swal.fire('Error', 'No se pudo cargar la configuración', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadOpenCajas() {
    try {
      const res = await fetch('/api/cajas?estado=abierta');
      const json = await res.json();
      const map = new Map();
      (json.data || []).forEach(c => {
        map.set(c.nombre_caja, {
          usuario: c.usuario_nombre,
          fecha: c.fecha_apertura
        });
      });
      setCajasEnUso(map);
    } catch (e) {
      console.error('Error cargando cajas abiertas', e);
    }
  }

  function formatDuration(fecha) {
    if (!fecha) return '';
    const start = new Date(fecha);
    const now = new Date();
    const diffMs = now - start;
    const mins = Math.floor(diffMs / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function isLongOpen(fecha) {
    if (!fecha) return false;
    const start = new Date(fecha);
    const now = new Date();
    const diffHours = (now - start) / (1000 * 60 * 60);
    return diffHours >= 4; // alerta después de 4 horas
  }

  function checkLongOpenAlerts() {
    cajasEnUso.forEach((uso, nombre) => {
      if (isLongOpen(uso.fecha)) {
        Swal.fire({
          title: 'Caja abierta por mucho tiempo',
          text: `${nombre} está en uso por ${uso.usuario}`,
          icon: 'warning',
          timer: 5000,
          showConfirmButton: false
        });
      }
    });
  }

  async function handleSaveConfig() {
    const result = await Swal.fire({
      title: '¿Guardar configuración?',
      text: '¿Estás seguro de actualizar la configuración del sistema?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      await updateConfig(config);
      Swal.fire({
        title: '¡Guardado!',
        text: 'La configuración se actualizó correctamente.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('[Configuracion] Error al guardar configuración:', error);
      Swal.fire('Error', 'No se pudo guardar la configuración', 'error');
    }
  }

  async function handleAddCaja(e) {
    e.preventDefault();
    if (!nuevaCaja.trim()) return;

    const result = await Swal.fire({
      title: '¿Agregar caja?',
      text: `¿Estás seguro de agregar la caja "${nuevaCaja}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, agregar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      await createCashRegisterName(nuevaCaja);
      setNuevaCaja('');
      loadData();
      Swal.fire({
        title: '¡Guardado!',
        text: 'Caja agregada correctamente.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire('Error', 'No se pudo agregar la caja', 'error');
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Configuración del Sistema</h1>
          <p className="admin-subtitle">Ajustes generales, almacén y cajas</p>
        </div>
      </div>

      <div className="config-grid">
        <div className="config-card">
          <div className="config-card-header">
            <Settings size={20} />
            <h2>Almacén e Inventario</h2>
          </div>
          <div className="config-card-body">
            <div className="form-group">
              <label>IVA (%)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={config.iva_rate ? (parseFloat(config.iva_rate) * 100) : ''}
                onChange={(e) => {
                  const percent = e.target.value;
                  const decimal = percent ? (parseFloat(percent) / 100).toString() : '';
                  setConfig(prev => ({ ...prev, iva_rate: decimal }));
                }}
                placeholder="Ej: 16"
              />
              <p className="help-text">Escribe 16 para 16%</p>
            </div>
            <div className="form-group">
              <label>Tipo de Cambio Dólar (MXN)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={config.tipo_cambio_dolar !== undefined && config.tipo_cambio_dolar !== '' ? config.tipo_cambio_dolar : ''}
                onChange={(e) => setConfig(prev => ({ ...prev, tipo_cambio_dolar: e.target.value }))}
                placeholder="Ej: 20.00"
              />
              <p className="help-text">Tipo de cambio para pagos en dólares (1 USD = X MXN)</p>
            </div>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox"
                  checked={config.permitir_stock_negativo === '0' || config.permitir_stock_negativo === 'false'}
                  onChange={(e) => setConfig({ ...config, permitir_stock_negativo: e.target.checked ? '0' : '1' })}
                />
                Bloquear ventas sin stock
              </label>
              <p className="help-text">El sistema no permitirá la venta si un ingrediente necesario llega a cero.</p>
            </div>
            <div className="form-group checkbox-group mt-3">
              <label className="checkbox-label">
                <input 
                  type="checkbox"
                  checked={config.permitir_stock_negativo === '1' || config.permitir_stock_negativo === 'true'}
                  onChange={(e) => setConfig({ ...config, permitir_stock_negativo: e.target.checked ? '1' : '0' })}
                />
                Permitir stock negativo
              </label>
              <p className="help-text">Los vendedores podrán vender el producto pero el stock se irá haciendo negativo (solo admin habilita esta opción).</p>
            </div>
            <button className="primary-btn mt-4" onClick={handleSaveConfig}>
              <Save size={18} /> Guardar Ajustes
            </button>
          </div>
        </div>

        <div className="config-card">
          <div className="config-card-header">
            <Wallet size={20} />
            <h2>Nombres de Cajas</h2>
          </div>
          <div className="config-card-body">
            <form className="add-caja-form" onSubmit={handleAddCaja}>
              <input 
                type="text" 
                placeholder="Nombre de la nueva caja (Ej: Caja 2)" 
                className="form-input"
                value={nuevaCaja}
                onChange={e => setNuevaCaja(e.target.value)}
              />
              <button type="submit" className="primary-btn"><Plus size={18} /> Agregar</button>
            </form>

            <ul className="cajas-list mt-4">
              {cajas.map(caja => {
                const uso = cajasEnUso.get(caja.nombre);
                const alerta = uso && isLongOpen(uso.fecha);
                return (
                  <li key={caja.id} className="caja-item">
                    <span style={{ color: alerta ? '#d9534f' : 'inherit', fontWeight: alerta ? '600' : 'normal' }}>
                      {caja.nombre}
                      {uso
                        ? ` • En uso por ${uso.usuario} • ${formatDuration(uso.fecha)}${alerta ? ' ⚠️' : ''}`
                        : ''}
                    </span>
                    {uso && (
                      <button
                        className="primary-btn"
                        style={{ marginLeft: '10px', padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => navigate(`/cierre-caja/${caja.id}`)}
                      >
                        Cerrar
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
