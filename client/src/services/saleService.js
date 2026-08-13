import api from './api.js';

/**
 * Obtiene todas las ventas
 */
export async function getSales(params = {}) {
  // cache-buster to avoid browser/proxy caching
  const queryParams = new URLSearchParams({
    ...params,
    _t: Date.now(),
    _r: Math.random().toString(36).substring(7)
  });
  const response = await api.get(`/ventas?${queryParams.toString()}`, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  return response.data.data;
}

/**
 * Obtiene una venta por ID
 */
export async function getSaleById(id) {
  const response = await api.get(`/ventas/${id}`);
  return response.data.data;
}

/**
 * Crea una nueva venta
 */
export async function createSale(saleData) {
  const response = await api.post('/ventas', saleData);
  const data = response.data.data;

  // Notify app (simple realtime without sockets)
  try {
    window.dispatchEvent(new CustomEvent('sale:created', { detail: data }));
    // Also use localStorage for cross-tab communication
    localStorage.setItem('sale:last_updated', Date.now().toString());
    localStorage.setItem('sale:last_data', JSON.stringify(data));
  } catch {}

  return data;
}

/**
 * Cancela una venta
 */
export async function cancelSale(id) {
  const response = await api.post(`/ventas/${id}/cancelar`);
  return response.data;
}

/**
 * Devuelve una venta (requiere contraseña)
 */
export async function refundSale(id, password, motivo) {
  const response = await api.post(`/ventas/${id}/devolver`, { password, motivo });
  return response.data;
}

/**
 * Imprime un ticket
 */
export async function printTicket(id) {
  const response = await api.post(`/ventas/${id}/imprimir`);
  return response.data.data;
}

/**
 * Obtiene resumen diario
 */
export async function getDailySummary(date) {
  const response = await api.get(`/ventas/resumen?date=${date}`);
  return response.data.data;
}

/**
 * Obtiene KPIs de ventas con filtros
 */
export async function getSalesKPIs(period = 'day', startDate = null, endDate = null, year = null) {
  const queryParams = new URLSearchParams({
    period,
    _t: Date.now(),
    _r: Math.random().toString(36).substring(7)
  });
  
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  if (year) queryParams.append('year', year);
  
  const response = await api.get(`/ventas/kpis?${queryParams.toString()}`, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  return response.data.data;
}
