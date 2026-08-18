// In Electron production, there is no dev proxy, so use absolute URL
const isElectron = typeof window !== 'undefined' && window.location.protocol === 'file:';

export const API_BASE_URL = isElectron
  ? 'http://localhost:3001/api'
  : '/api';

export const DEFAULT_CATEGORIES = [
  'Todas',
  'Cafés Calientes',
  'Cafés Fríos',
  'Frappés',
  'Especiales',
  'Tés'
];

// Esta función se usará para cargar categorías dinámicamente
export async function getCategories() {
  const categoriesSet = new Set(['Todas', ...DEFAULT_CATEGORIES]);
  
  try {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };

    // 1. Cargar desde /api/categorias
    try {
      const res1 = await fetch(`${API_BASE_URL}/categorias`, { headers });
      if (res1.ok) {
        const data1 = await res1.json();
        if (data1.success && Array.isArray(data1.data)) {
          data1.data.forEach(c => {
            const name = typeof c === 'string' ? c : c?.nombre;
            if (name) categoriesSet.add(name);
          });
        }
      }
    } catch (e) {}

    // 2. Cargar categorías de productos existentes /api/productos/categorias
    try {
      const res2 = await fetch(`${API_BASE_URL}/productos/categorias`, { headers });
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2.success && Array.isArray(data2.data)) {
          data2.data.forEach(c => {
            const name = typeof c === 'string' ? c : c?.nombre;
            if (name) categoriesSet.add(name);
          });
        }
      }
    } catch (e) {}

  } catch (error) {
    console.error('Error al cargar categorías:', error);
  }

  return Array.from(categoriesSet);
}

export const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' }
];

export const MILK_TYPES = [
  { id: 'entera', name: 'Leche Entera' },
  { id: 'deslactosada', name: 'Deslactosada' },
  { id: 'almendra', name: 'Leche de Almendra' },
  { id: 'avena', name: 'Leche de Avena' },
  { id: 'coco', name: 'Leche de Coco' },
  { id: 'soya', name: 'Leche de Soya' }
];

export const TOPPINGS = [
  { id: 'chocolate', name: 'Chocolate', price: 5 },
  { id: 'caramelo', name: 'Caramelo', price: 5 },
  { id: 'whipped_cream', name: 'Crema Batida', price: 8 },
  { id: 'chips_chocolate', name: 'Chips de Chocolate', price: 6 },
  { id: 'nuez', name: 'Nuez Picada', price: 7 },
  { id: 'canela', name: 'Canela', price: 3 }
];

export const COLD_FOAM = [
  { id: 'none', name: 'Sin Cold Foam', price: 0 },
  { id: 'vanilla', name: 'Cold Foam Vainilla', price: 10 },
  { id: 'caramel', name: 'Cold Foam Caramelo', price: 10 },
  { id: 'mocha', name: 'Cold Foam Mocha', price: 12 },
  { id: 'pumpkin', name: 'Cold Foam Calabaza', price: 12 }
];

export const SYRUPS = [
  { id: 'none', name: 'Sin Jarabe', price: 0 },
  { id: 'vanilla', name: 'Vainilla', price: 5 },
  { id: 'caramel', name: 'Caramelo', price: 5 },
  { id: 'hazelnut', name: 'Avellana', price: 5 },
  { id: 'chocolate', name: 'Chocolate', price: 5 },
  { id: 'raspberry', name: 'Frambuesa', price: 6 },
  { id: 'peppermint', name: 'Menta', price: 6 },
  { id: 'cinnamon', name: 'Canela', price: 4 }
];

export const TEA_OPTIONS = [
  { id: 'hot', name: 'Caliente' },
  { id: 'iced', name: 'Helado' }
];

export const SWEETNESS_LEVELS = [
  { id: '0', name: 'Sin azúcar' },
  { id: '25', name: '25%' },
  { id: '50', name: '50%' },
  { id: '75', name: '75%' },
  { id: '100', name: '100%' }
];
