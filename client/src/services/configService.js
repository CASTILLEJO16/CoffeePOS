import api from './api.js';

export async function getAllConfig() {
  const response = await api.get('/configuracion');
  return response.data.data;
}

export async function updateConfig(configuraciones) {
  const response = await api.post('/configuracion', { configuraciones });
  return response.data;
}
