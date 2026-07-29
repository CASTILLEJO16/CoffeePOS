import api from './api.js';

/**
 * Servicio de Actividad de Usuario
 * Obtiene todo el historial de actividades de un usuario
 */

export async function getUserActivity(userId) {
  try {
    const response = await api.get(`/usuarios/${userId}/actividad`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener actividad del usuario:', error);
    throw error;
  }
}

export async function getUserCashRegisters(userId) {
  try {
    const response = await api.get(`/usuarios/${userId}/cajas`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener cajas del usuario:', error);
    throw error;
  }
}

export async function getUserSales(userId) {
  try {
    const response = await api.get(`/usuarios/${userId}/ventas`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener ventas del usuario:', error);
    throw error;
  }
}

export async function getUserLogs(userId) {
  try {
    const response = await api.get(`/usuarios/${userId}/logs`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener logs del usuario:', error);
    throw error;
  }
}
