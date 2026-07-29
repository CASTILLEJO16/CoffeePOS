import './OrderSummary.css';
import { formatCurrency } from '../../utils/formatCurrency.js';
import Button from '../common/Button.jsx';

export default function OrderSummary({ subtotal, impuestos, total, onCheckout, onCancel, onClear, disabled }) {
  // 🔥 Calcular IVA en tiempo real (evita valores viejos en el state)
  const ivaRate = (() => {
    const val = localStorage.getItem('iva_rate');
    const num = val ? parseFloat(val) : 0.16;
    return Number.isFinite(num) ? num : 0.16;
  })();
  const ivaPercent = Math.round(ivaRate * 100);

  const impuestosCalc = subtotal * ivaRate;
  const totalCalc = subtotal + impuestosCalc;
  return (
    <div className="order-summary">
      <div className="order-summary-totals">
        <div className="summary-row">
          <span className="summary-label">Subtotal</span>
          <span className="summary-value">{formatCurrency(subtotal)}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">IVA ({ivaPercent}%)</span>
          <span className="summary-value">{formatCurrency(impuestosCalc)}</span>
        </div>
        <div className="summary-row summary-row-total">
          <span className="summary-label summary-label-total">Total</span>
          <span className="summary-value summary-value-total">{formatCurrency(totalCalc)}</span>
        </div>
      </div>
      <div className="order-summary-actions">
        <Button 
          variant="success" 
          size="large" 
          className="checkout-button"
          onClick={onCheckout}
          disabled={disabled || total === 0}
        >
          Cobrar
        </Button>
        <Button 
          variant="danger" 
          size="medium" 
          onClick={onCancel}
          disabled={disabled || total === 0}
        >
          Cancelar
        </Button>
        <Button 
          variant="secondary" 
          size="medium" 
          onClick={onClear}
          disabled={disabled || total === 0}
        >
          Vaciar
        </Button>
      </div>
    </div>
  );
}
