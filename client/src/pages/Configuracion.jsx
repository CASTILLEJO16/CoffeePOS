import { useState, useEffect } from 'react';
import { Settings, Save, Plus, Wallet, FileText } from 'lucide-react';
import { getAllConfig, updateConfig } from '../services/configService.js';
import { getCashRegisterNames, createCashRegisterName } from '../services/cashRegisterService.js';
import Swal from 'sweetalert2';
import './Configuracion.css';

export default function Configuracion() {
  const [config, setConfig] = useState({ permitir_stock_negativo: '0' });
  const [cajas, setCajas] = useState([]);
  const [nuevaCaja, setNuevaCaja] = useState('');
  const [loading, setLoading] = useState(true);
  const [customIVA, setCustomIVA] = useState('');
  const [ivaOptions, setIvaOptions] = useState([8,12,16]);

  useEffect(() => {
    loadData();
    // cargar opciones guardadas
    const saved = localStorage.getItem('iva_options');
    if (saved) {
      try {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) setIvaOptions(arr);
      } catch {}
    }
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const configData = await getAllConfig();
      const cajasData = await getCashRegisterNames();
      
      setConfig(prev => ({ ...prev, ...configData }));
      setCajas(cajasData || []);
    } catch (error) {
      console.error('Error loading config:', error);
      Swal.fire('Error', 'No se pudo cargar la configuración', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfig() {
    try {
      await updateConfig(config);

      // 🔁 Volver a pedir configuración REAL del backend
      const fresh = await getAllConfig();

      if (fresh?.iva_rate) {
        localStorage.setItem('iva_rate', fresh.iva_rate);
      }

      // ✅ guardar IVA personalizado en lista
      const percent = parseFloat(config.iva_rate) * 100;
      if (!Number.isNaN(percent) && percent > 0) {
        setIvaOptions(prev => {
          const exists = prev.includes(percent);
          const updated = exists ? prev : [...prev, percent].sort((a,b)=>a-b);
          localStorage.setItem('iva_options', JSON.stringify(updated));
          return updated;
        });
      }

      // Notificar a todo el sistema
      window.dispatchEvent(new Event('ivaUpdated'));

      // ✅ Forzar sincronización total (evita desfaces)
      setTimeout(() => {
        window.location.reload();
      }, 500);
      Swal.fire({
        title: '¡Guardado!',
        text: 'La configuración se actualizó correctamente.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire('Error', 'No se pudo guardar la configuración', 'error');
    }
  }

  async function handleAddCaja(e) {
    e.preventDefault();
    if (!nuevaCaja.trim()) return;
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
    <div className="admin-page configuracion-page">
      <div className="configuracion-header">
        <h1 className="configuracion-title">Configuración del Sistema</h1>
      </div>

      <div className="configuracion-content">
        <div className="config-section">
          <h2 className="section-title"><FileText size={18} style={{marginRight: 8}} />Configuración General</h2>
          <div className="config-form">
            <div className="form-group">
              <label className="form-label">Nombre del Negocio</label>
              <input type="text" className="form-input" defaultValue="Coffee POS" disabled />
            </div>
            <div className="form-group">
              <label className="form-label">Porcentaje de IVA (%)</label>
              <select
                className="form-input"
                value={config.iva_rate ? (parseFloat(config.iva_rate) * 100).toString() : ''}
                onChange={(e) => {
                  const percent = e.target.value;
                  if (percent === 'custom') return;

                  const decimal = percent ? (parseFloat(percent) / 100).toString() : '';
                  setConfig(prev => ({ ...prev, iva_rate: decimal }));

                  if (decimal) {
                    localStorage.setItem('iva_rate', decimal);
                    window.dispatchEvent(new Event('ivaUpdated'));
                  }
                }}
              >
                <option value="">Seleccionar...</option>
                {ivaOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}%</option>
                ))}
                <option value="custom">Otro...</option>
              </select>

              {/* IVA personalizado */}
              <input
                type="number"
                placeholder="Ej: 10"
                className="form-input"
                style={{ marginTop: 10 }}
                value={customIVA}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomIVA(val);

                  if (!val) return;

                  const decimal = (parseFloat(val) / 100).toString();
                  setConfig(prev => ({ ...prev, iva_rate: decimal }));

                  localStorage.setItem('iva_rate', decimal);
                  window.dispatchEvent(new Event('ivaUpdated'));
                }}
              />
            </div>
          </div>
        </div>

        <div className="config-section">
          <h2 className="section-title"><Settings size={18} style={{marginRight: 8}} />Almacén e Inventario</h2>
          <div className="config-form">
            <div className="form-group" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <input 
                type="checkbox"
                id="bloquear"
                style={{width: 20, height: 20, cursor: 'pointer'}}
                checked={config.permitir_stock_negativo === '0' || config.permitir_stock_negativo === 'false'}
                onChange={(e) => setConfig({ ...config, permitir_stock_negativo: e.target.checked ? '0' : '1' })}
              />
              <label htmlFor="bloquear" className="form-label" style={{marginBottom: 0, cursor: 'pointer'}}>
                Bloquear ventas sin stock
              </label>
            </div>
            <p style={{fontSize: '0.85rem', color: '#666', marginTop: '-10px', marginBottom: '20px', paddingLeft: '30px'}}>
              El sistema no permitirá la venta si un ingrediente necesario llega a cero.
            </p>

            <div className="form-group" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <input 
                type="checkbox"
                id="permitir"
                style={{width: 20, height: 20, cursor: 'pointer'}}
                checked={config.permitir_stock_negativo === '1' || config.permitir_stock_negativo === 'true'}
                onChange={(e) => setConfig({ ...config, permitir_stock_negativo: e.target.checked ? '1' : '0' })}
              />
              <label htmlFor="permitir" className="form-label" style={{marginBottom: 0, cursor: 'pointer'}}>
                Permitir stock negativo
              </label>
            </div>
            <p style={{fontSize: '0.85rem', color: '#666', marginTop: '-10px', paddingLeft: '30px'}}>
              Los vendedores podrán vender el producto pero el stock se irá haciendo negativo.
            </p>

            <button className="save-button" onClick={handleSaveConfig} style={{marginTop: 15}}>
              <Save size={18} style={{marginRight: 8}} />
              Guardar Ajustes
            </button>
          </div>
        </div>

        <div className="config-section">
          <h2 className="section-title"><Wallet size={18} style={{marginRight: 8}} />Nombres de Cajas</h2>
          <div className="config-form">
            <form onSubmit={handleAddCaja} style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
              <input 
                type="text" 
                placeholder="Nueva caja (Ej: Caja 2)" 
                className="form-input"
                style={{flex: 1}}
                value={nuevaCaja}
                onChange={e => setNuevaCaja(e.target.value)}
              />
              <button type="submit" className="save-button" style={{margin: 0}}>
                <Plus size={18} style={{marginRight: 4}} /> Agregar
              </button>
            </form>

            <div style={{border: '1px solid #ddd', borderRadius: 8, maxHeight: 200, overflowY: 'auto'}}>
              {cajas.map(caja => (
                <div key={caja.id} style={{padding: '12px 15px', borderBottom: '1px solid #ddd'}}>
                  {caja.nombre}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
