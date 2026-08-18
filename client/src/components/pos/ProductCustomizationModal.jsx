import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useCustomizations } from '../../hooks/useCustomizations.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import './ProductCustomizationModal.css';

function normalizeCustomization(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const normalized = {};
  Object.keys(raw).forEach(key => {
    const val = raw[key];
    if (Array.isArray(val)) {
      normalized[key] = val;
    } else if (val && typeof val === 'object' && val.id) {
      normalized[key] = [val];
    } else {
      normalized[key] = [];
    }
  });
  return normalized;
}

// Comparación flexible para ID y Nombre
function isSameOption(sel, option) {
  if (!sel || !option) return false;
  // 1. Comparar por ID
  if (String(sel.id) === String(option.id)) return true;
  // 2. Comparar por Nombre (exacto o contenido)
  if (sel.name && option.name) {
    const sName = String(sel.name).toLowerCase().trim();
    const oName = String(option.name).toLowerCase().trim();
    if (sName === oName) return true;
    if (sName.includes(oName) || oName.includes(sName)) return true;
  }
  return false;
}

export default function ProductCustomizationModal({ product, isOpen, onClose, onConfirm, existingCustomization = null, isEdit = false }) {
  const { customizations: serverCustomizations, tipos, loading, refetch } = useCustomizations();
  
  const [customization, setCustomization] = useState({});

  const existingKey = JSON.stringify(existingCustomization || {});

  // Inicializar estado cuando abre el modal o cambia el item a editar
  useEffect(() => {
    if (isOpen) {
      // Recargar personalizaciones al abrir el modal para tener los datos más recientes
      refetch().then(() => {
        if (isEdit && existingCustomization) {
          setCustomization(normalizeCustomization(existingCustomization));
        } else {
          const initial = {};
          tipos.forEach(tipo => { initial[tipo] = []; });
          setCustomization(initial);
        }
      });
    }
  }, [isOpen, isEdit, existingKey]);

  if (!isOpen || !product) {
    return null;
  }

  const toggleOption = (tipo, option) => {
    setCustomization(prev => {
      const currentSelections = Array.isArray(prev[tipo]) ? prev[tipo] : [];
      const isAlreadySelected = currentSelections.some(sel => isSameOption(sel, option));

      if (tipo === 'topping') {
        if (isAlreadySelected) {
          return {
            ...prev,
            [tipo]: currentSelections.filter(sel => !isSameOption(sel, option))
          };
        } else {
          return { ...prev, [tipo]: [...currentSelections, option] };
        }
      } else {
        if (isAlreadySelected) {
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
    if (!isEdit) {
      const initial = {};
      tipos.forEach(tipo => { initial[tipo] = []; });
      setCustomization(initial);
    }
  };

  const calculateExtraPrice = () => {
    let extra = 0;
    if (customization && typeof customization === 'object') {
      Object.values(customization).forEach(selections => {
        if (Array.isArray(selections)) {
          selections.forEach(sel => {
            extra += sel?.price || 0;
          });
        }
      });
    }
    return extra;
  };

  const extraPrice = calculateExtraPrice();
  const basePrice = product.precio || 0;
  const finalPrice = basePrice + extraPrice;

  // Mostrar todos los tipos de personalización sin ocultar ninguna sección
  const renderableTipos = tipos;

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
          {loading && Object.keys(serverCustomizations).length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>Cargando personalizaciones...</div>
          ) : (
            renderableTipos.map(tipo => {
              const options = serverCustomizations[tipo] || [];
              if (options.length === 0) return null;
              
              const isMultiple = tipo === 'topping';

              return (
                <div key={tipo} className="customization-section">
                  <h3 className="section-title">{formatTipoNombre(tipo)} {isMultiple && <small style={{fontSize: '0.7em', fontWeight: 'normal'}}>(Múltiple)</small>}</h3>
                  <div className="options-grid" role="group">
                    {options.map(option => {
                      const isSelected = (Array.isArray(customization[tipo]) ? customization[tipo] : []).some(
                        sel => isSameOption(sel, option)
                      );
                      return (
                        <button
                          key={option.id}
                          className={`option-button ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleOption(tipo, option)}
                          aria-pressed={isSelected}
                          type="button"
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
            })
          )}
        </div>

        <div className="customization-footer">
          <div className="price-summary">
            <span className="base-price">Base: {formatCurrency(basePrice)}</span>
            {extraPrice > 0 && (
              <span className="extra-price">Extra: +{formatCurrency(extraPrice)}</span>
            )}
            <span className="final-price">Total: {formatCurrency(finalPrice)}</span>
          </div>
          <button className="confirm-button" onClick={handleConfirm} type="button">
            {isEdit ? 'Actualizar' : 'Agregar a la Orden'}
          </button>
        </div>
      </div>
    </div>
  );
}
