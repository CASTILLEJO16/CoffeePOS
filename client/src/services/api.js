import axios from 'axios';
import { API_BASE_URL } from '../utils/constants.js';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token a las requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const branchId = localStorage.getItem('branchId') || '1';
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Attach branch header for multi-sucursal
    config.headers['x-branch-id'] = branchId;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Use SPA navigation-safe fallback
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('force-logout'));
        }
      } catch (_) {}
    }
    return Promise.reject(error);
  }
);

export default api;
