import { API_BASE_URL } from '../utils/constants.js';

/**
 * Servicio de Categorías
 * Maneja las operaciones CRUD para categorías de productos
 */

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

export async function getCategories() {
  try {
    const response = await fetch(`${API_BASE_URL}/categorias`);
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    throw error;
  }
}

export async function createCategory(nombre) {
  try {
    const response = await fetch(`${API_BASE_URL}/categorias`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ nombre }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al crear categoría');
    }
    return data.data;
  } catch (error) {
    console.error('Error al crear categoría:', error);
    throw error;
  }
}

export async function updateCategory(id, nombre) {
  try {
    const response = await fetch(`${API_BASE_URL}/categorias/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ nombre }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al actualizar categoría');
    }
    return data.data;
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    throw error;
  }
}

export async function deleteCategory(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/categorias/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al eliminar categoría');
    }
    return data;
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    throw error;
  }
}
