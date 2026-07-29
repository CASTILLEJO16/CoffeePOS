import { useState, useEffect } from 'react';
import { getIngredientes } from '../services/almacenService.js';
import Swal from 'sweetalert2';
import './AdminAlmacen.css';

export default function VendedorAlmacen() {
  const [ingredientes, setIngredientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const ingRes = await getIngredientes();
      setIngredientes(ingRes || []);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Error al cargar datos del almacén', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filtered = ingredientes.filter(i =>
    i.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const totalBajos = ingredientes.filter(i => i.stock_actual <= i.stock_minimo).length;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Almacén</h1>
          <p className="admin-subtitle">Consulta de inventario y disponibilidad</p>
        </div>
        {totalBajos > 0 && (
          <div className="badge-bajo" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
            ⚠️ {totalBajos} ingrediente{totalBajos > 1 ? 's' : ''} con stock bajo
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading">Cargando almacén...</div>
      ) : (
        <div className="almacen-content">
          <div className="tab-section">
            <div className="section-header">
              <h2>Inventario Actual</h2>
              <input
                type="text"
                className="form-input"
                placeholder="Buscar ingrediente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ maxWidth: 280 }}
              />
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th>Stock Actual</th>
                  <th>Mínimo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ing => {
                  const isLow = ing.stock_actual <= ing.stock_minimo;
                  return (
                    <tr key={ing.id} className={isLow ? 'stock-bajo' : ''}>
                      <td><strong>{ing.nombre}</strong></td>
                      <td className="fw-bold">{ing.stock_actual} {ing.unidad_medida}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{ing.stock_minimo} {ing.unidad_medida}</td>
                      <td>
                        {isLow
                          ? <span className="badge-bajo">⚠️ Stock bajo</span>
                          : <span className="badge-ok">✓ Suficiente</span>
                        }
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan="4" className="empty-text">No se encontraron ingredientes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
