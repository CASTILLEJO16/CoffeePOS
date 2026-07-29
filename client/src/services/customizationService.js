import api from './api.js';

/**
 * Servicio de Personalizaciones (Cliente)
 * Maneja las peticiones HTTP relacionadas con opciones de personalización
 */

/**
 * Obtiene todas las personalizaciones
 * @param {string} tipo - Tipo de personalización (opcional)
 * @returns {Promise} Lista de personalizaciones
 */
export async function getCustomizations(tipo = null) {
  try {
    const params = tipo ? { tipo } : {};
    const response = await api.get('/personalizaciones', { params });
    return response.data.data;
  } catch (error) {
    console.error('Error al obtener personalizaciones:', error);
    throw error;
  }
}

/**
 * Obtiene una personalización por ID
 * @param {number} id - ID de la personalización
 * @returns {Promise} Personalización
 */
export async function getCustomizationById(id) {
  try {
    const response = await api.get(`/personalizaciones/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Error al obtener personalización:', error);
    throw error;
  }
}

/**
 * Crea una nueva personalización
 * @param {Object} customizationData - Datos de la personalización
 * @returns {Promise} Personalización creada
 */
export async function createCustomization(customizationData) {
  try {
    const response = await api.post('/personalizaciones', customizationData);
    return response.data.data;
  } catch (error) {
    console.error('Error al crear personalización:', error);
    throw error;
  }
}

/**
 * Actualiza una personalización
 * @param {number} id - ID de la personalización
 * @param {Object} customizationData - Datos a actualizar
 * @returns {Promise} Personalización actualizada
 */
export async function updateCustomization(id, customizationData) {
  try {
    const response = await api.put(`/personalizaciones/${id}`, customizationData);
    return response.data.data;
  } catch (error) {
    console.error('Error al actualizar personalización:', error);
    throw error;
  }
}

/**
 * Elimina una personalización
 * @param {number} id - ID de la personalización
 * @returns {Promise} Confirmación de eliminación
 */
export async function deleteCustomization(id) {
  try {
    const response = await api.delete(`/personalizaciones/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error al eliminar personalización:', error);
    throw error;
  }
}
