import { useState, useMemo } from 'react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';
import './PaymentModals.css';

export default function DollarPaymentModal({ isOpen, onClose, total, tipoCambio, onConfirm }) {
  console.log('[DollarPaymentModal] render', { isOpen, total, tipoCambio });
  const [dolarRecibido, setDolarRecibido] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalDolar = useMemo(() => {
    return Number((total / tipoCambio).toFixed(2));
  }, [total, tipoCambio]);

  const received = useMemo(() => {
    const val = parseFloat(dolarRecibido);
    return isNaN(val) ? 0 : val;
  }, [dolarRecibido]);

  const cambioDolar = useMemo(() => {
    return Number((received - totalDolar).toFixed(2));
  }, [received, totalDolar]);

  const cambioPesos = useMemo(() => {
    return Number((cambioDolar * tipoCambio).toFixed(2));
  }, [cambioDolar, tipoCambio]);

  function handleDolarChange(e) {
    setDolarRecibido(e.target.value);
  }

  function handleConfirm() {
    if (submitting) return;
    if (cambioDolar < 0) return;

    console.log('[DollarPaymentModal] confirm', { received, cambioDolar, cambioPesos });
    setSubmitting(true);
    onConfirm({ 
      dolar_recibido: received, 
      cambio_pesos: cambioPesos,
      tipo_cambio: tipoCambio,
      monto_dolar: totalDolar
    });
    reset();
  }

  function reset() {
    setDolarRecibido('');
    setSubmitting(false);
  }

  function handleClose() {
    console.log('[DollarPaymentModal] close');
    reset();
    onClose();
  }

  // Suggested quick add amounts to reach rounded totals in dollars
  const suggestions = useMemo(() => {
    const targets = [
      Math.ceil(totalDolar),
      Math.ceil(totalDolar * 2) / 2,
      Math.ceil(totalDolar),
      Math.ceil(totalDolar * 2),
      Math.ceil(totalDolar * 5),
      Math.ceil(totalDolar * 10)
    ];
    const unique = Array.from(new Set(targets));
    return unique
      .map(t => Number((t - received).toFixed(2)))
      .filter(v => v > 0 && v <= 50);
  }, [totalDolar, received]);

  // Common dollar amounts
  const dollarAmounts = [1, 5, 10, 20, 50, 100];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Pago en Dólares"
      size="extra-large"
      footer={
        <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
          <Button onClick={handleClose} className="modal-action-btn cancel">Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={cambioDolar < 0 || submitting}
            className="modal-action-btn confirm"
          >
            Cobrar
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', gap: 24 }}>
        {/* LEFT PANEL */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="exchange-rate-badge">
            <span className="exchange-rate-label">Tipo de Cambio</span>
            <span className="exchange-rate-value">1 USD = {formatCurrency(tipoCambio)} MXN</span>
          </div>

          <div className="amount-section">
            <span className="amount-label">Total en Pesos</span>
            <span className="amount-value">{formatCurrency(total)}</span>
          </div>

          <div className="amount-section">
            <span className="amount-label">Total en Dólares</span>
            <span className="amount-value success">${totalDolar.toFixed(2)} USD</span>
          </div>

          <div className="amount-section">
            <span className="amount-label">Dólares Recibidos</span>
            <span className="amount-value primary">{received.toFixed(2)} USD</span>
          </div>

          <div className="amount-section">
            {cambioDolar >= 0 ? (
              <>
                <span className="amount-label">Cambio (Dólares)</span>
                <span className="amount-value success">${cambioDolar.toFixed(2)} USD</span>
                <span style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  = {formatCurrency(cambioPesos)} MXN
                </span>
              </>
            ) : (
              <>
                <span className="amount-label">Faltan (Dólares)</span>
                <span className="amount-value danger">${Math.abs(cambioDolar).toFixed(2)} USD</span>
                <span style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  = {formatCurrency(Math.abs(cambioDolar) * tipoCambio)} MXN
                </span>
              </>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* QUICK ACTIONS */}
          <div className="quick-actions">
            <button
              onClick={() => {
                setDolarRecibido(String(totalDolar.toFixed(2)));
              }}
              className="quick-action-btn primary"
            >
              Exacto
            </button>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => setDolarRecibido(String((received + s).toFixed(2)))}
                className="quick-action-btn"
              >
                +${s.toFixed(1)} USD
              </button>
            ))}
          </div>

          {/* DOLLAR AMOUNTS */}
          <div>
            <div style={{ marginBottom: 8, fontSize: 13, opacity: 0.7 }}>Montos Comunes en Dólares</div>
            <div className="denominations-grid">
              {dollarAmounts.map(v => (
                <button
                  key={v}
                  onClick={() => setDolarRecibido(String((received + v).toFixed(2)))}
                  className="denomination-btn"
                >
                  ${v}
                </button>
              ))}
            </div>
          </div>

          {/* MANUAL INPUT */}
          <div>
            <div style={{ marginBottom: 6, fontSize: 13, opacity: 0.7 }}>Ingresa monto en dólares</div>
            <Input
              placeholder="Ej: 20"
              value={dolarRecibido}
              onChange={handleDolarChange}
              type="number"
              step="0.01"
              className="payment-input"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
