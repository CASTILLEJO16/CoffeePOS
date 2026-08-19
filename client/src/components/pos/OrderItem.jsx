import { X, Plus, Minus } from 'lucide-react';
import './OrderItem.css';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function OrderItem({ item, onUpdateQuantity, onRemove, onEdit }) {
  const hasCustomizations = item.personalizaciones && Object.keys(item.personalizaciones).length > 0;
  
  const getCustomizationText = () => {
    if (!hasCustomizations) return null;
    
    const parts = [];
    const p = item.personalizaciones;
    
    // Soporte para estructura dinámica { tipo: [ { id, name, ... } ] }
    Object.values(p).forEach(selections => {
      if (Array.isArray(selections)) {
        selections.forEach(sel => {
          if (sel && sel.name && sel.id !== 'none' && sel.id !== 'entera' && sel.id !== '50' && sel.id !== 'hot') {
            parts.push(sel.name);
          }
        });
      } else if (selections && selections.name && selections.id !== 'none' && selections.id !== 'entera' && selections.id !== '50' && selections.id !== 'hot') {
        parts.push(selections.name);
      }
    });

    // Soporte legacy por si acaso
    if (p.milkType && p.milkType.name && p.milkType.id !== 'entera' && !parts.includes(p.milkType.name)) {
      parts.push(p.milkType.name);
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
          <span 
            className="order-item-name" 
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => onEdit && onEdit(item)}
            title="Click para editar personalizaciones"
          >
            {item.producto_nombre}
          </span>
          {customizationText && (
            <span 
              className="order-item-customization"
              style={{ cursor: 'pointer' }}
              onClick={() => onEdit && onEdit(item)}
              title="Click para editar personalizaciones"
            >
              {customizationText}
            </span>
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
