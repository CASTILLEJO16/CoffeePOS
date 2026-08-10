import { useState, useMemo } from 'react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';

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
    <Modal isOpen={isOpen} onClose={handleClose} title="Pago en efectivo" size="extra-large">
      <div style={{ display: 'flex', gap: 24 }}>
        {/* LEFT PANEL */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, opacity: 0.7 }}>Total de la venta</div>
            <div style={{ fontSize: 34, fontWeight: '700' }}>{formatCurrency(total)}</div>
          </div>

          <div>
            <div style={{ fontSize: 14, opacity: 0.7 }}>Monto recibido</div>
            <div style={{ fontSize: 34, fontWeight: '700' }}>{formatCurrency(received)}</div>
          </div>

          <div>
            {difference >= 0 ? (
              <>
                <div style={{ fontSize: 14, opacity: 0.7 }}>Cambio</div>
                <div style={{ fontSize: 30, fontWeight: '700', color: '#16a34a' }}>
                  {formatCurrency(difference)}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, opacity: 0.7 }}>Faltan</div>
                <div style={{ fontSize: 30, fontWeight: '700', color: '#dc2626' }}>
                  {formatCurrency(Math.abs(difference))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* QUICK ACTIONS */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setMode('manual');
                setManualAmount(String(total.toFixed(2)));
              }}
              style={{ padding: '10px 14px', borderRadius: 8, border: '2px solid #4f46e5', background: '#4f46e5', color: '#fff', fontWeight: 700 }}
            >
              Exacto
            </button>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => addDenomination(s)}
                style={{ padding: '10px 14px', borderRadius: 8, border: '2px solid #374151', background: '#374151', color: '#fff', fontWeight: 600 }}
              >
                +${s}
              </button>
            ))}
          </div>
          {/* BILLS */}
          <div>
            <div style={{ marginBottom: 8, fontSize: 13, opacity: 0.7 }}>Billetes</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {bills.map(v => (
                <button
                  key={v}
                  onClick={() => addDenomination(v)}
                  style={{
                    padding: 22,
                    fontSize: 18,
                    fontWeight: 700,
                    borderRadius: 10,
                    border: '2px solid #111827',
                    background: '#111827',
                    color: '#ffffff'
                  }}
                >
                  ${v}
                </button>
              ))}
            </div>
          </div>

          {/* COINS */}
          <div>
            <div style={{ marginBottom: 8, fontSize: 13, opacity: 0.7 }}>Monedas</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {coins.map(v => (
                <button
                  key={v}
                  onClick={() => addDenomination(v)}
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    fontWeight: 700,
                    border: '2px solid #1f2937',
                    background: '#1f2937',
                    color: '#ffffff'
                  }}
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
            />
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button
          onClick={handleConfirm}
          disabled={difference < 0 || submitting}
          style={{ fontSize: 18, padding: '14px 24px' }}
        >
          Cobrar
        </Button>
      </div>
    </Modal>
  );
}
