/**
 * Middleware de logging
 * Registra cada request HTTP
 */

/**
 * Logger de requests
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  // Log inicial del request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);

  // Capturar el response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    originalSend.call(this, data);
  };

  next();
}
