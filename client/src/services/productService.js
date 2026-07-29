import api from './api.js';

/**
 * Obtiene todos los productos activos
 */
export async function getProducts(search = '', category = '') {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category) params.append('categoria', category);

  const response = await api.get(`/productos?${params.toString()}`);
  return response.data.data;
}

/**
 * Obtiene todos los productos (incluyendo inactivos) - Solo admin
 */
export async function getAllProducts() {
  const response = await api.get('/productos/admin/todos');
  return response.data.data;
}

/**
 * Obtiene un producto por ID
 */
export async function getProductById(id) {
  const response = await api.get(`/productos/${id}`);
  return response.data.data;
}

/**
 * Obtiene todas las categorías
 */
export async function getCategories() {
  const response = await api.get('/productos/categorias');
  return response.data.data;
}

/**
 * Crea un nuevo producto (admin)
 * Acepta FormData para incluir imagen
 */
export async function createProduct(productData) {
  const isFormData = productData instanceof FormData;
  const response = await api.post('/productos', productData, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
  });
  return response.data.data;
}

/**
 * Actualiza un producto (admin)
 * Acepta FormData para incluir imagen
 */
export async function updateProduct(id, productData) {
  const isFormData = productData instanceof FormData;
  const response = await api.put(`/productos/${id}`, productData, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
  });
  return response.data.data;
}

/**
 * Desactiva un producto (admin)
 */
export async function deactivateProduct(id) {
  const response = await api.patch(`/productos/${id}/desactivar`);
  return response.data;
}

/**
 * Activa un producto (admin)
 */
export async function activateProduct(id) {
  const response = await api.patch(`/productos/${id}/activar`);
  return response.data;
}

/**
 * Elimina un producto (admin)
 */
export async function deleteProduct(id) {
  const response = await api.delete(`/productos/${id}`);
  return response.data;
}
