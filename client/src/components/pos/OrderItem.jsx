import { X, Plus, Minus } from 'lucide-react';
import './OrderItem.css';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function OrderItem({ item, onUpdateQuantity, onRemove }) {
  const hasCustomizations = item.personalizaciones && Object.keys(item.personalizaciones).length > 0;
  
  const getCustomizationText = () => {
    if (!hasCustomizations) return null;
    
    const parts = [];
    const p = item.personalizaciones;
    
    if (p.milkType && p.milkType.id !== 'entera') {
      parts.push(p.milkType.name);
    }
    
    if (p.toppings && p.toppings.length > 0) {
      parts.push(p.toppings.map(t => t.name).join(', '));
    }
    
    if (p.coldFoam && p.coldFoam.id !== 'none') {
      parts.push(p.coldFoam.name);
    }
    
    if (p.syrup && p.syrup.id !== 'none') {
      parts.push(p.syrup.name);
    }
    
    if (p.sweetness && p.sweetness.id !== '50') {
      parts.push(p.sweetness.name);
    }
    
    if (p.teaOption && p.teaOption.id !== 'hot') {
      parts.push(p.teaOption.name);
    }
    
    return parts.length > 0 ? parts.join(' • ') : null;
  };
  
  const customizationText = getCustomizationText();
  
  return (
    <div className="order-item">
      <div className="order-item-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            className="order-item-qty-btn"
            onClick={() => onUpdateQuantity(item.uniqueId, item.cantidad - 1)}
          >
            <Minus size={14} />
          </button>

          <span className="order-item-quantity">{item.cantidad}</span>

          <button
            className="order-item-qty-btn"
            onClick={() => onUpdateQuantity(item.uniqueId, item.cantidad + 1)}
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="order-item-details">
          <span className="order-item-name">{item.producto_nombre}</span>
          {customizationText && (
            <span className="order-item-customization">{customizationText}</span>
          )}
        </div>
      </div>
      <div className="order-item-actions">
        <span className="order-item-price">{formatCurrency(item.importe)}</span>
        <button 
          type="button"
          className="order-item-remove" 
          onClick={() => onRemove(item.uniqueId)}
          aria-label="Eliminar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
