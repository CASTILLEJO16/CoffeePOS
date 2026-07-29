import api from './api.js';

/**
 * Obtiene los nombres predefinidos de cajas
 */
export async function getCashRegisterNames() {
  const response = await api.get('/cajas/nombres');
  return response.data.data;
}

/**
 * Crea un nuevo nombre de caja
 */
export async function createCashRegisterName(nombre) {
  const response = await api.post('/cajas/nombres', { nombre });
  return response.data;
}

/**
 * Obtiene la caja abierta del usuario actual
 */
export async function getOpenCashRegister() {
  const response = await api.get('/cajas/abierta');
  return response.data.data;
}

/**
 * Abre una nueva caja
 */
export async function openCashRegister(data) {
  const response = await api.post('/cajas/abrir', data);
  return response.data.data;
}

/**
 * Obtiene el resumen de una caja antes de cerrarla
 */
export async function getCashRegisterSummary(id) {
  const response = await api.get(`/cajas/${id}/resumen`);
  return response.data.data;
}

/**
 * Cierra una caja
 */
export async function closeCashRegister(id, data) {
  const response = await api.post(`/cajas/${id}/cerrar`, data);
  return response.data.data;
}

/**
 * Obtiene una caja por ID
 */
export async function getCashRegisterById(id) {
  const response = await api.get(`/cajas/${id}`);
  return response.data.data;
}

/**
 * Obtiene todas las cajas (para administradores)
 */
export async function getAllCashRegisters(params = {}) {
  const queryParams = new URLSearchParams(params);
  const response = await api.get(`/cajas?${queryParams.toString()}`);
  return response.data.data;
}
