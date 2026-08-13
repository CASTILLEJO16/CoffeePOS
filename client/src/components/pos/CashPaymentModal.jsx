import { useState, useMemo } from 'react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';
import './PaymentModals.css';

export default function CashPaymentModal({ isOpen, onClose, total, onConfirm }) {
  console.log('[CashPaymentModal] render', { isOpen, total });
  const [denominationsTotal, setDenominationsTotal] = useState(0);
  const [manualAmount, setManualAmount] = useState('');
  const [mode, setMode] = useState('buttons');
  const [submitting, setSubmitting] = useState(false);

  const received = useMemo(() => {
    if (mode === 'manual') {
      const val = parseFloat(manualAmount);
      return isNaN(val) ? 0 : val;
    }
    return denominationsTotal;
  }, [mode, manualAmount, denominationsTotal]);

  const difference = useMemo(() => {
    return Number((received - total).toFixed(2));
  }, [received, total]);

  function addDenomination(value) {
    setMode('buttons');
    setDenominationsTotal(prev => Number((prev + value).toFixed(2)));
  }

  function handleManualChange(e) {
    setMode('manual');
    setManualAmount(e.target.value);
  }

  function handleConfirm() {
    if (submitting) return;
    if (difference < 0) return;

    console.log('[CashPaymentModal] confirm', { received, difference });
    setSubmitting(true);
    onConfirm({ recibido: received, cambio: difference });
    reset();
  }

  function reset() {
    setDenominationsTotal(0);
    setManualAmount('');
    setMode('buttons');
    setSubmitting(false);
  }

  function handleClose() {
    console.log('[CashPaymentModal] close');
    reset();
    onClose();
  }

  const bills = [20, 50, 100, 200, 500, 1000];
  const coins = [1, 2, 5, 10, 20];

  // Suggested quick add amounts to reach rounded totals
  const suggestions = useMemo(() => {
    const targets = [
      Math.ceil(total),
      Math.ceil(total / 10) * 10,
      Math.ceil(total / 50) * 50,
      Math.ceil(total / 100) * 100
    ];
    const unique = Array.from(new Set(targets));
    return unique
      .map(t => Number((t - received).toFixed(2)))
      .filter(v => v > 0 && v <= 200);
  }, [total, received]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Pago en efectivo"
      size="extra-large"
      footer={
        <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
          <Button onClick={handleClose} className="modal-action-btn cancel">Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={difference < 0 || submitting}
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
          <div className="amount-section">
            <span className="amount-label">Total de la venta</span>
            <span className="amount-value">{formatCurrency(total)}</span>
          </div>

          <div className="amount-section">
            <span className="amount-label">Monto recibido</span>
            <span className="amount-value primary">{formatCurrency(received)}</span>
          </div>

          <div className="amount-section">
            {difference >= 0 ? (
              <>
                <span className="amount-label">Cambio</span>
                <span className="amount-value success">{formatCurrency(difference)}</span>
              </>
            ) : (
              <>
                <span className="amount-label">Faltan</span>
                <span className="amount-value danger">{formatCurrency(Math.abs(difference))}</span>
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
                setMode('manual');
                setManualAmount(String(total.toFixed(2)));
              }}
              className="quick-action-btn primary"
            >
              Exacto
            </button>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => addDenomination(s)}
                className="quick-action-btn"
              >
                +${s}
              </button>
            ))}
          </div>

          {/* BILLS */}
          <div>
            <div style={{ marginBottom: 8, fontSize: 13, opacity: 0.7 }}>Billetes</div>
            <div className="denominations-grid">
              {bills.map(v => (
                <button
                  key={v}
                  onClick={() => addDenomination(v)}
                  className="denomination-btn"
                >
                  ${v}
                </button>
              ))}
            </div>
          </div>

          {/* COINS */}
          <div>
            <div style={{ marginBottom: 8, fontSize: 13, opacity: 0.7 }}>Monedas</div>
            <div className="coins-container">
              {coins.map(v => (
                <button
                  key={v}
                  onClick={() => addDenomination(v)}
                  className="coin-btn"
                >
                  ${v}
                </button>
              ))}
            </div>
          </div>

          {/* MANUAL INPUT */}
          <div>
            <div style={{ marginBottom: 6, fontSize: 13, opacity: 0.7 }}>Ingresa monto</div>
            <Input
              placeholder="Ej: 200"
              value={manualAmount}
              onChange={handleManualChange}
              className="payment-input"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
