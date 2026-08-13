import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useCustomizations } from '../../hooks/useCustomizations.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import './ProductCustomizationModal.css';

export default function ProductCustomizationModal({ product, isOpen, onClose, onConfirm, existingCustomization = null, isEdit = false }) {
  const { customizations: serverCustomizations, tipos, loading } = useCustomizations();
  
  const [customization, setCustomization] = useState({});

  // Inicializar con personalizaciones existentes si estamos editando
  useEffect(() => {
    if (!loading && tipos.length > 0) {
      if (isEdit && existingCustomization) {
        // Usar personalizaciones existentes
        setCustomization(existingCustomization);
      } else {
        // Inicializar vacío
        const initial = {};
        tipos.forEach(tipo => {
          initial[tipo] = [];
        });
        setCustomization(initial);
      }
    }
  }, [loading, tipos, isEdit, existingCustomization]);

  if (!isOpen || !product || loading) {
    return null;
  }

  const isTea = product?.categoria?.includes('Té') || product?.categoria === 'Tés';
  const isColdDrink = product?.categoria?.includes('Frío') || product?.categoria?.includes('Frappé') || 
                      product?.categoria === 'Cafés Fríos' || product?.categoria === 'Frappés';

  const toggleOption = (tipo, option) => {
    setCustomization(prev => {
      const currentSelections = prev[tipo] || [];
      // Si es topping, permitimos múltiples. Si no, reemplazamos (solo 1).
      if (tipo === 'topping') {
        const exists = currentSelections.find(t => t.id === option.id);
        if (exists) {
          return { ...prev, [tipo]: currentSelections.filter(t => t.id !== option.id) };
        } else {
          return { ...prev, [tipo]: [...currentSelections, option] };
        }
      } else {
        // Si ya está seleccionado, lo quitamos. Si no, lo ponemos.
        const exists = currentSelections.length > 0 && currentSelections[0].id === option.id;
        if (exists) {
          return { ...prev, [tipo]: [] };
        } else {
          return { ...prev, [tipo]: [option] };
        }
      }
    });
  };

  const handleConfirm = () => {
    onConfirm(customization);
    onClose();
    // Reset solo si no estamos editando
    if (!isEdit) {
      const initial = {};
      tipos.forEach(tipo => { initial[tipo] = []; });
      setCustomization(initial);
    }
  };

  const calculateExtraPrice = () => {
    let extra = 0;
    Object.values(customization).forEach(selections => {
      selections.forEach(sel => {
        extra += sel.price || 0;
      });
    });
    return extra;
  };

  const extraPrice = calculateExtraPrice();
  const finalPrice = product.precio + extraPrice;

  // Filtrar tipos según el producto (p. ej. té vs leche)
  const renderableTipos = tipos.filter(tipo => {
    if (tipo === 'tea_option' && !isTea) return false;
    if (tipo === 'milk' && isTea) return false;
    if (tipo === 'cold_foam' && !isColdDrink) return false;
    return true;
  });

  function formatTipoNombre(tipoId) {
    const map = {
      'milk': 'Tipo de Leche',
      'topping': 'Toppings',
      'cold_foam': 'Cold Foam',
      'syrup': 'Jarabes',
      'tea_option': 'Opciones de Té',
      'sweetness': 'Nivel de Dulzura'
    };
    if (map[tipoId]) return map[tipoId];
    return tipoId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  return (
    <div className="customization-overlay">
      <div className="customization-modal">
        <div className="customization-header">
          <h2 className="customization-title">{isEdit ? 'Editar' : 'Personalizar'} {product.nombre}</h2>
          <button type="button" className="customization-close" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="customization-body">
          {renderableTipos.map(tipo => {
            const options = serverCustomizations[tipo] || [];
            if (options.length === 0) return null;
            
            const isMultiple = tipo === 'topping';

            return (
              <div key={tipo} className="customization-section">
                <h3 className="section-title">{formatTipoNombre(tipo)} {isMultiple && <small style={{fontSize: '0.7em', fontWeight: 'normal'}}>(Múltiple)</small>}</h3>
                <div className="options-grid" role="group">
                  {options.map(option => {
                    const isSelected = (customization[tipo] || []).some(sel => sel.id === option.id);
                    return (
                      <button
                        key={option.id}
                        className={`option-button ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleOption(tipo, option)}
                        aria-pressed={isSelected}
                      >
                        <span className="option-name">{option.name}</span>
                        {option.price > 0 && (
                          <span className="option-price">+{formatCurrency(option.price)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="customization-footer">
          <div className="price-summary">
            <span className="base-price">Base: {formatCurrency(product.precio)}</span>
            {extraPrice > 0 && (
              <span className="extra-price">Extra: +{formatCurrency(extraPrice)}</span>
            )}
            <span className="final-price">Total: {formatCurrency(finalPrice)}</span>
          </div>
          <button className="confirm-button" onClick={handleConfirm}>
            {isEdit ? 'Actualizar' : 'Agregar a la Orden'}
          </button>
        </div>
      </div>
    </div>
  );
}
