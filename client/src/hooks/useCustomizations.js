import { useState, useEffect } from 'react';
import { getCustomizations } from '../services/customizationService.js';
import { MILK_TYPES, TOPPINGS, COLD_FOAM, SYRUPS, TEA_OPTIONS, SWEETNESS_LEVELS } from '../utils/constants.js';

const DEFAULT_SERVER_CUSTOMIZATIONS = {
  milk: MILK_TYPES.map(m => ({ id: String(m.id), name: m.name, price: m.price || 0, tipo: 'milk' })),
  topping: TOPPINGS.map(t => ({ id: String(t.id), name: t.name, price: t.price || 0, tipo: 'topping' })),
  cold_foam: COLD_FOAM.map(c => ({ id: String(c.id), name: c.name, price: c.price || 0, tipo: 'cold_foam' })),
  syrup: SYRUPS.map(s => ({ id: String(s.id), name: s.name, price: s.price || 0, tipo: 'syrup' })),
  tea_option: TEA_OPTIONS.map(t => ({ id: String(t.id), name: t.name, price: t.price || 0, tipo: 'tea_option' })),
  sweetness: SWEETNESS_LEVELS.map(s => ({ id: String(s.id), name: s.name, price: s.price || 0, tipo: 'sweetness' }))
};

/**
 * Hook para cargar personalizaciones combinando valores por defecto y servidor
 */
export function useCustomizations() {
  const [customizations, setCustomizations] = useState(DEFAULT_SERVER_CUSTOMIZATIONS);
  const [tipos, setTipos] = useState(Object.keys(DEFAULT_SERVER_CUSTOMIZATIONS));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCustomizations();
  }, []);

  async function loadCustomizations() {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getCustomizations();
      
      if (Array.isArray(data) && data.length > 0) {
        // Clonar personalizaciones por defecto
        const grouped = {};
        Object.keys(DEFAULT_SERVER_CUSTOMIZATIONS).forEach(tipoKey => {
          grouped[tipoKey] = [...DEFAULT_SERVER_CUSTOMIZATIONS[tipoKey]];
        });

        const uniqueTipos = new Set(Object.keys(DEFAULT_SERVER_CUSTOMIZATIONS));
        
        data.forEach(c => {
          if (!c.activo) return;

          if (!grouped[c.tipo]) {
            grouped[c.tipo] = [];
          }
          uniqueTipos.add(c.tipo);

          const cId = String(c.id);
          const cNameNorm = c.nombre.toLowerCase().trim();

          const existingIndex = grouped[c.tipo].findIndex(existing => 
            String(existing.id) === cId || 
            existing.name.toLowerCase().trim() === cNameNorm ||
            cNameNorm.includes(existing.name.toLowerCase().trim()) ||
            existing.name.toLowerCase().trim().includes(cNameNorm)
          );

          if (existingIndex >= 0) {
            grouped[c.tipo][existingIndex] = {
              id: cId,
              name: c.nombre,
              price: c.precio_adicional || 0,
              tipo: c.tipo
            };
          } else {
            grouped[c.tipo].push({
              id: cId,
              name: c.nombre,
              price: c.precio_adicional || 0,
              tipo: c.tipo
            });
          }
        });

        setCustomizations(grouped);
        setTipos(Array.from(uniqueTipos));
      }
    } catch (err) {
      console.error('Error al cargar personalizaciones:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return { customizations, tipos, loading, error, refetch: loadCustomizations };
}