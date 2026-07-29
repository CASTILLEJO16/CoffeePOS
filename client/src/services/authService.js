import api from './api.js';

/**
 * Inicia sesión
 */
export async function login(usuario, contraseña) {
  const response = await api.post('/auth/login', { usuario, contraseña });
  return response.data.data;
}

/**
 * Cierra sesión
 */
export async function logout() {
  const response = await api.post('/auth/logout');
  return response.data;
}

/**
 * Verifica token
 */
export async function verifyToken() {
  const response = await api.get('/auth/verify');
  return response.data.data;
}

/**
 * Obtiene todos los usuarios
 */
export async function getUsers() {
  const response = await api.get('/usuarios');
  return response.data.data;
}

/**
 * Crea un nuevo usuario
 */
export async function createUser(userData) {
  const response = await api.post('/usuarios', userData);
  return response.data.data;
}

/**
 * Actualiza un usuario existente
 */
export async function updateUser(id, userData) {
  const response = await api.put(`/usuarios/${id}`, userData);
  return response.data.data;
}

/**
 * Guarda token en localStorage
 */
export function saveToken(token) {
  localStorage.setItem('token', token);
}

/**
 * Guarda usuario en localStorage
 */
export function saveUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Obtiene token del localStorage
 */
export function getToken() {
  return localStorage.getItem('token');
}

/**
 * Obtiene usuario del localStorage
 */
export function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

/**
 * Elimina token y usuario del localStorage
 */
export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

/**
 * Verifica si el usuario está autenticado
 */
export function isAuthenticated() {
  return !!getToken();
}

/**
 * Activa un usuario (admin)
 */
export async function activateUser(id) {
  const response = await api.patch(`/usuarios/${id}/activar`);
  return response.data;
}

/**
 * Desactiva un usuario (admin)
 */
export async function deactivateUser(id) {
  const response = await api.patch(`/usuarios/${id}/desactivar`);
  return response.data;
}
