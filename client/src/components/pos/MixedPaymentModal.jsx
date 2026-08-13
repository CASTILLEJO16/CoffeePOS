import { useState, useMemo } from 'react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { DollarSign, CreditCard, Smartphone, Plus, Trash2 } from 'lucide-react';
import './PaymentModals.css';

// Montos predefinidos para efectivo MXN
const MXN_AMOUNTS = [20, 50, 100, 200, 500, 1000];

// Montos predefinidos para USD
const USD_AMOUNTS = [1, 5, 10, 20, 50, 100];

// Montos predefinidos para tarjeta
const CARD_AMOUNTS = [100, 200, 500, 1000];

export default function MixedPaymentModal({ isOpen, onClose, total, tipoCambio, onConfirm }) {
  const [payments, setPayments] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Calcular total pagado en MXN
  const totalPaidMXN = useMemo(() => {
    return payments.reduce((sum, p) => {
      if (p.method === 'dolar') {
        return sum + (p.amount * tipoCambio);
      }
      return sum + p.amount;
    }, 0);
  }, [payments, tipoCambio]);

  // Calcular lo que falta
  const remaining = useMemo(() => {
    return Number((total - totalPaidMXN).toFixed(2));
  }, [total, totalPaidMXN]);

  // Calcular cambio
  const change = useMemo(() => {
    return Number((totalPaidMXN - total).toFixed(2));
  }, [totalPaidMXN, total]);

  function addPayment(method) {
    const newPayment = {
      id: Date.now(),
      method,
      amount: 0,
      cardType: method === 'tarjeta' ? 'credito' : null
    };
    setPayments([...payments, newPayment]);
  }

  function removePayment(id) {
    setPayments(payments.filter(p => p.id !== id));
  }

  function updatePaymentAmount(id, amount) {
    setPayments(payments.map(p => 
      p.id === id ? { ...p, amount: parseFloat(amount) || 0 } : p
    ));
  }

  function updateCardType(id, cardType) {
    setPayments(payments.map(p => 
      p.id === id ? { ...p, cardType } : p
    ));
  }

  function handleConfirm() {
    if (submitting) return;
    if (remaining > 0.01) {
      alert('Falta completar el pago');
      return;
    }

    setSubmitting(true);

    // Agrupar pagos por método para el backend
    const paymentData = {
      efectivo_mxn: payments.filter(p => p.method === 'efectivo').reduce((sum, p) => sum + p.amount, 0),
      efectivo_usd: payments.filter(p => p.method === 'dolar').reduce((sum, p) => sum + p.amount, 0),
      tarjeta_credito: payments.filter(p => p.method === 'tarjeta' && p.cardType === 'credito').reduce((sum, p) => sum + p.amount, 0),
      tarjeta_debito: payments.filter(p => p.method === 'tarjeta' && p.cardType === 'debito').reduce((sum, p) => sum + p.amount, 0),
      tipo_cambio: tipoCambio,
      cambio_pesos: change > 0 ? change : 0
    };

    onConfirm(paymentData);
    reset();
  }

  function reset() {
    setPayments([]);
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function getMethodLabel(method) {
    switch (method) {
      case 'efectivo': return 'Efectivo MXN';
      case 'dolar': return 'Efectivo USD';
      case 'tarjeta': return 'Tarjeta';
      default: return method;
    }
  }

  function getMethodIcon(method) {
    switch (method) {
      case 'efectivo': return <DollarSign size={18} />;
      case 'dolar': return <DollarSign size={18} />;
      case 'tarjeta': return <CreditCard size={18} />;
      default: return null;
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Pago Mixto"
      size="extra-large"
      footer={
        <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
          <Button onClick={handleClose} className="modal-action-btn cancel">Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={remaining > 0.01 || submitting}
            className="modal-action-btn confirm"
          >
            Cobrar
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', gap: 24 }}>
        {/* LEFT PANEL - Totals */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="amount-section">
            <span className="amount-label">Total a Pagar</span>
            <span className="amount-value">{formatCurrency(total)}</span>
          </div>

          <div className="amount-section">
            <span className="amount-label">Total Pagado</span>
            <span className="amount-value primary">{formatCurrency(totalPaidMXN)}</span>
          </div>

          <div className="amount-section">
            {remaining > 0.01 ? (
              <>
                <span className="amount-label">Falta</span>
                <span className="amount-value danger">{formatCurrency(remaining)}</span>
              </>
            ) : (
              <>
                <span className="amount-label">Cambio</span>
                <span className="amount-value success">{formatCurrency(change)}</span>
              </>
            )}
          </div>

          <div className="exchange-rate-badge" style={{ marginTop: 'auto' }}>
            <span className="exchange-rate-label">Tipo de Cambio</span>
            <span className="exchange-rate-value">1 USD = {formatCurrency(tipoCambio)} MXN</span>
          </div>
        </div>

        {/* RIGHT PANEL - Payment Methods */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ADD PAYMENT BUTTONS */}
          <div className="payment-methods-grid">
            <button
              onClick={() => addPayment('efectivo')}
              className="payment-method-card cash"
            >
              <DollarSign size={24} className="payment-method-icon" />
              <span className="payment-method-label">Efectivo MXN</span>
            </button>
            <button
              onClick={() => addPayment('dolar')}
              className="payment-method-card usd"
            >
              <DollarSign size={24} className="payment-method-icon" />
              <span className="payment-method-label">Efectivo USD</span>
            </button>
            <button
              onClick={() => addPayment('tarjeta')}
              className="payment-method-card card"
            >
              <CreditCard size={24} className="payment-method-icon" />
              <span className="payment-method-label">Tarjeta</span>
            </button>
          </div>

          {/* QUICK COMPLETE BUTTON */}
          {remaining > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  const lastPayment = payments[payments.length - 1];
                  if (lastPayment) {
                    const amountToAdd = lastPayment.method === 'dolar'
                      ? remaining / tipoCambio
                      : remaining;
                    updatePaymentAmount(lastPayment.id, (lastPayment.amount || 0) + amountToAdd);
                  }
                }}
                className="quick-action-btn primary"
                style={{ flex: 1 }}
              >
                Completar con último método
              </button>
              <button
                onClick={() => {
                  const lastPayment = payments[payments.length - 1];
                  if (lastPayment) {
                    const exactAmount = lastPayment.method === 'dolar'
                      ? total / tipoCambio
                      : total;
                    updatePaymentAmount(lastPayment.id, exactAmount);
                  }
                }}
                className="quick-action-btn"
                style={{ flex: 1 }}
              >
                Exacto
              </button>
            </div>
          )}

          {/* PAYMENTS LIST */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {payments.length === 0 ? (
              <div className="empty-payments">
                Agrega métodos de pago arriba
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {payments.map(payment => (
                  <div
                    key={payment.id}
                    className="payment-item-card"
                  >
                    <div className="payment-item-header">
                      <div className="payment-item-title">
                        {getMethodIcon(payment.method)}
                        {getMethodLabel(payment.method)}
                      </div>
                      <button
                        onClick={() => removePayment(payment.id)}
                        className="remove-payment-btn"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {payment.method === 'tarjeta' && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Tipo de tarjeta</div>
                        <div className="card-type-selector">
                          <button
                            onClick={() => updateCardType(payment.id, 'credito')}
                            className={`card-type-btn ${payment.cardType === 'credito' ? 'active' : ''}`}
                          >
                            Crédito
                          </button>
                          <button
                            onClick={() => updateCardType(payment.id, 'debito')}
                            className={`card-type-btn ${payment.cardType === 'debito' ? 'active' : ''}`}
                          >
                            Débito
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                        {payment.method === 'dolar' ? 'Monto en USD' : 'Monto'}
                      </div>

                      {/* Montos predefinidos */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                        {(() => {
                          const amounts = payment.method === 'dolar' ? USD_AMOUNTS :
                                        payment.method === 'tarjeta' ? CARD_AMOUNTS :
                                        MXN_AMOUNTS;
                          return amounts.map(amount => (
                            <button
                              key={amount}
                              onClick={() => updatePaymentAmount(payment.id, (payment.amount || 0) + amount)}
                              className="quick-action-btn"
                              style={{ padding: '8px 12px', fontSize: '13px' }}
                            >
                              +${amount}
                            </button>
                          ));
                        })()}
                      </div>

                      {/* Input manual */}
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={payment.amount || ''}
                        onChange={(e) => updatePaymentAmount(payment.id, e.target.value)}
                        className="payment-input"
                      />

                      {payment.method === 'dolar' && payment.amount > 0 && (
                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, fontWeight: 600, color: 'var(--color-info)' }}>
                          ≈ {formatCurrency(payment.amount * tipoCambio)} MXN
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
