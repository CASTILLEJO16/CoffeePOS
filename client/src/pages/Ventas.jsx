import { useState, useEffect } from 'react';
import { getSales } from '../services/saleService.js';
import { formatCurrency, formatDate } from '../utils/formatCurrency.js';
import './Ventas.css';

export default function Ventas() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSales();

    // 🔥 escuchar nuevas ventas en tiempo real
    function handleNewSale() {
      loadSales();
    }

    window.addEventListener('saleCreated', handleNewSale);
    return () => window.removeEventListener('saleCreated', handleNewSale);
  }, []);

  async function loadSales() {
    try {
      setLoading(true);
      const data = await getSales();
      setSales(data);
    } catch (error) {
      console.error('Error al cargar ventas:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="loading">Cargando ventas...</div>;
  }

  return (
    <div className="ventas-page">
      <div className="ventas-header">
        <h1 className="ventas-title">Historial de Ventas</h1>
      </div>

      <div className="ventas-content">
        {sales.length === 0 ? (
          <div className="empty-state">
            <p>No hay ventas registradas</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Subtotal</th>
                <th>IVA</th>
                <th>Total</th>
                <th>Método</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(sale => (
                <tr key={sale.id}>
                  <td>#{sale.id}</td>
                  <td>{formatDate(sale.fecha)}</td>
                  <td>{sale.usuario_nombre || 'N/A'}</td>
                  <td>{formatCurrency(sale.subtotal)}</td>
                  <td>{formatCurrency(sale.impuestos)}</td>
                  <td className="total-cell">{formatCurrency(sale.total)}</td>
                  <td>
                    <span className={`payment-badge ${sale.metodo_pago}`}>
                      {sale.metodo_pago}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
