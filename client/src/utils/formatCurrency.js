import { formatBusinessDateTime } from './dateTime.js';

/**
 * Formatea un valor como moneda
 * @param {number} value - Valor a formatear
 * @returns {string} Valor formateado como moneda
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }).format(value);
}

/**
 * Formatea una fecha en zona America/Tijuana
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
export function formatDate(date) {
  return formatBusinessDateTime(date);
}
