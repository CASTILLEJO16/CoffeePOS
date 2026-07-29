import api from './api.js';

export async function getIngredientes() {
  const response = await api.get('/almacen/ingredientes');
  return response.data.data;
}

export async function createIngrediente(data) {
  const response = await api.post('/almacen/ingredientes', data);
  return response.data.data;
}

export async function updateIngrediente(id, data) {
  const response = await api.put(`/almacen/ingredientes/${id}`, data);
  return response.data;
}

export async function deleteIngrediente(id) {
  const response = await api.delete(`/almacen/ingredientes/${id}`);
  return response.data;
}

export async function ajustarStock(id, cantidad, tipo = 'agregar') {
  const response = await api.post(`/almacen/ingredientes/${id}/ajuste`, { cantidad, tipo });
  return response.data;
}

export async function getRecetaProducto(productoId) {
  const response = await api.get(`/almacen/recetas/producto/${productoId}`);
  return response.data.data;
}

export async function saveRecetaProducto(productoId, ingredientes) {
  const response = await api.post(`/almacen/recetas/producto/${productoId}`, { ingredientes });
  return response.data;
}

export async function getRecetaPersonalizacion(personalizacionId) {
  const response = await api.get(`/almacen/recetas/personalizacion/${personalizacionId}`);
  return response.data.data;
}

export async function saveRecetaPersonalizacion(personalizacionId, ingredientes) {
  const response = await api.post(`/almacen/recetas/personalizacion/${personalizacionId}`, { ingredientes });
  return response.data;
}
