import { createContext, useContext, useReducer, useEffect } from 'react';

const OrderContext = createContext();

const initialState = {
  items: [],
  subtotal: 0,
  impuestos: 0,
  total: 0
};

function getIVARate() {
  const val = localStorage.getItem('iva_rate');
  const num = val ? parseFloat(val) : 0.16;
  return Number.isFinite(num) ? num : 0.16;
}

function orderReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, customization } = action.payload;
      
      // Crear un ID único basado en producto + personalizaciones
      const customizationKey = JSON.stringify(customization || {});
      const uniqueId = `${product.id}_${customizationKey}`;
      
      const existingItem = state.items.find(item => item.unique_id === uniqueId);
      
      // Calcular precio adicional por personalizaciones
      const customizationPrice = calculateCustomizationPrice(customization);
      const finalPrice = product.precio + customizationPrice;
      
      let newItems;
      if (existingItem) {
        newItems = state.items.map(item =>
          item.unique_id === uniqueId
            ? { ...item, cantidad: item.cantidad + 1, importe: (item.cantidad + 1) * item.precio_final }
            : item
        );
      } else {
        newItems = [
          ...state.items,
          {
            unique_id: uniqueId,
            producto_id: product.id,
            producto_nombre: product.nombre,
            precio_base: product.precio,
            precio_final: finalPrice,
            cantidad: 1,
            importe: finalPrice,
            personalizaciones: customization || {}
          }
        ];
      }

      const subtotal = newItems.reduce((sum, item) => sum + item.importe, 0);
      const iva = getIVARate();
      const impuestos = subtotal * iva;
      const total = subtotal + impuestos;

      return {
        ...state,
        items: newItems,
        subtotal,
        impuestos,
        total
      };
    }

    case 'REMOVE_ITEM': {
      const { uniqueId } = action.payload;
      const newItems = state.items.filter(item => item.unique_id !== uniqueId);
      
      const subtotal = newItems.reduce((sum, item) => sum + item.importe, 0);
      const iva = getIVARate();
      const impuestos = subtotal * iva;
      const total = subtotal + impuestos;

      return {
        ...state,
        items: newItems,
        subtotal,
        impuestos,
        total
      };
    }

    case 'UPDATE_QUANTITY': {
      const { uniqueId, cantidad } = action.payload;
      if (cantidad <= 0) {
        return orderReducer(state, { type: 'REMOVE_ITEM', payload: { uniqueId } });
      }

      const newItems = state.items.map(item =>
        item.unique_id === uniqueId
          ? { ...item, cantidad, importe: cantidad * item.precio_final }
          : item
      );

      const subtotal = newItems.reduce((sum, item) => sum + item.importe, 0);
      const iva = getIVARate();
      const impuestos = subtotal * iva;
      const total = subtotal + impuestos;

      return {
        ...state,
        items: newItems,
        subtotal,
        impuestos,
        total
      };
    }

    case 'CLEAR_ORDER':
      return initialState;

    case 'RECALC': {
      const iva = getIVARate();
      const subtotal = state.items.reduce((sum, item) => sum + item.importe, 0);
      const impuestos = subtotal * iva;
      const total = subtotal + impuestos;
      return {
        ...state,
        subtotal,
        impuestos,
        total
      };
    }

    default:
      return state;
  }
}

export function OrderProvider({ children }) {
  const [state, dispatch] = useReducer(orderReducer, initialState);

  // 🔥 Escuchar cambios de IVA y recalcular automáticamente
  useEffect(() => {
    function handleIVAUpdate() {
      // 🔥 recalcular usando el estado actual
      dispatch({ type: 'RECALC' });
    }

    // también recalcular al montar por si ya cambió antes
    dispatch({ type: 'RECALC' });

    window.addEventListener('ivaUpdated', handleIVAUpdate);
    return () => window.removeEventListener('ivaUpdated', handleIVAUpdate);
  }, []);

  const addItem = (product, customization) => {
    dispatch({ type: 'ADD_ITEM', payload: { product, customization } });
  };

  const removeItem = (uniqueId) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { uniqueId } });
  };

  const updateQuantity = (uniqueId, cantidad) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { uniqueId, cantidad } });
  };

  const clearOrder = () => {
    dispatch({ type: 'CLEAR_ORDER' });
  };

  const recalcTotals = () => {
    dispatch({ type: 'RECALC' });
  };

  const value = {
    ...state,
    addItem,
    removeItem,
    updateQuantity,
    clearOrder,
    recalcTotals
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
}

function calculateCustomizationPrice(customization) {
  if (!customization) return 0;
  
  let total = 0;
  
  // Iterar sobre todas las claves de personalización
  Object.values(customization).forEach(selections => {
    if (Array.isArray(selections)) {
      selections.forEach(option => {
        total += option.price || 0;
      });
    } else if (selections && selections.price) {
      total += selections.price;
    }
  });
  
  return total;
}
