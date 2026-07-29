/**
 * Middleware de manejo de errores
 * Captura y procesa errores de forma centralizada
 */

/**
 * Manejador de errores global
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Error de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  // Error de base de datos
  if (err.message && err.message.includes('SQLITE')) {
    return res.status(500).json({
      success: false,
      error: 'Error en la base de datos'
    });
  }

  // Error por defecto
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
}

/**
 * Middleware para rutas no encontradas
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  });
}
