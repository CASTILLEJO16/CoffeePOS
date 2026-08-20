import { useState, useEffect } from 'react';
import { getSales, refundSale } from '../services/saleService.js';
import { formatCurrency, formatDate } from '../utils/formatCurrency.js';
import { formatPaymentMethod } from '../utils/salesAnalytics.js';
import Modal from '../components/common/Modal.jsx';
import { RotateCcw } from 'lucide-react';
import Swal from 'sweetalert2';
import './Ventas.css';

export default function Ventas() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado para modal de devolución
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundPassword, setRefundPassword] = useState('');
  const [refundMotivo, setRefundMotivo] = useState('');
  const [refundError, setRefundError] = useState('');
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  function handleOpenRefundModal(venta) {
    setVentaSeleccionada(venta);
    setRefundModalOpen(true);
    setRefundPassword('');
    setRefundMotivo('');
    setRefundError('');
  }

  function handleCloseRefundModal() {
    setRefundModalOpen(false);
    setRefundPassword('');
    setRefundMotivo('');
    setRefundError('');
    setVentaSeleccionada(null);
  }

  async function handleRefund() {
    if (!ventaSeleccionada) return;

    const result = await Swal.fire({
      title: '¿Confirmar devolución?',
      text: `¿Estás seguro de devolver la venta #${ventaSeleccionada.id} por ${formatCurrency(ventaSeleccionada.total)}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, devolver',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    setActionLoading(true);
    setRefundError('');

    try {
      await refundSale(ventaSeleccionada.id, refundPassword, refundMotivo);
      handleCloseRefundModal();
      loadSales(); // Recargar ventas

      await Swal.fire({
        title: '¡Devolución Exitosa!',
        text: 'La venta ha sido devuelta correctamente.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      setRefundError(err.response?.data?.error || 'Error al procesar la devolución');
      await Swal.fire({
        title: 'Error',
        text: err.response?.data?.error || 'Error al procesar la devolución',
        icon: 'error'
      });
    } finally {
      setActionLoading(false);
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
                <th>Estado</th>
                <th>Acciones</th>
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
                      {formatPaymentMethod(sale.metodo_pago, sale.tipo_tarjeta)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${sale.cancelada ? 'cancelled' : 'completed'}`}>
                      {sale.cancelada ? 'Cancelada' : 'Completada'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      {!sale.cancelada && (
                        <button
                          type="button"
                          title="Devolver venta"
                          onClick={() => handleOpenRefundModal(sale)}
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Devolución */}
      <Modal
        isOpen={refundModalOpen}
        onClose={handleCloseRefundModal}
        title="Devolver Venta"
        size="medium"
        footer={
          <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleCloseRefundModal}
              disabled={actionLoading}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '2px solid var(--color-border)',
                background: 'var(--color-surface)',
                cursor: actionLoading ? 'not-allowed' : 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRefund}
              disabled={actionLoading || !refundPassword}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--color-danger)',
                color: 'white',
                cursor: actionLoading || !refundPassword ? 'not-allowed' : 'pointer',
                opacity: actionLoading || !refundPassword ? 0.5 : 1
              }}
            >
              {actionLoading ? 'Procesando...' : 'Devolver'}
            </button>
          </div>
        }
      >
        {ventaSeleccionada && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'var(--color-surface-muted)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                Venta #{ventaSeleccionada.id}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>
                Total: {formatCurrency(ventaSeleccionada.total)}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>
                Usuario: {ventaSeleccionada.usuario_nombre || 'N/A'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Contraseña de autorización
              </label>
              <input
                type="password"
                value={refundPassword}
                onChange={(e) => setRefundPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '2px solid var(--color-border)',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Motivo de la devolución (opcional)
              </label>
              <textarea
                value={refundMotivo}
                onChange={(e) => setRefundMotivo(e.target.value)}
                placeholder="Describe el motivo de la devolución..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '2px solid var(--color-border)',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            {refundError && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--color-danger-light)',
                color: 'var(--color-danger)',
                fontSize: '14px'
              }}>
                {refundError}
              </div>
            )}

            <div style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'var(--color-warning-light)',
              color: 'var(--color-warning)',
              fontSize: '13px'
            }}>
              ⚠️ Esta acción cancelará la venta y descontará el monto de la caja. Esta acción no se puede deshacer.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
