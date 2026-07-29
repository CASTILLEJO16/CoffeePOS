import { verifyToken as verifyJWT } from '../services/authService.js';
import { queryOne } from '../config/database.js';

/**
 * Middleware de autenticación
 * Verifica que el token JWT sea válido
 */
export function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Formato de autorización inválido'
      });
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token no proporcionado'
      });
    }

    const decoded = verifyJWT(token);

    // Verificar que el usuario siga activo
    queryOne('SELECT id, rol, activo FROM usuarios WHERE id = ?', [decoded.userId])
      .then(user => {
        if (!user || user.activo !== 1) {
          return res.status(403).json({
            success: false,
            error: 'Usuario inválido o inactivo'
          });
        }

        req.user = {
          ...decoded,
          role: user.rol // asegurar rol actualizado
        };

        next();
      })
      .catch(() => {
        return res.status(500).json({
          success: false,
          error: 'Error verificando usuario'
        });
      });
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Token inválido o expirado'
    });
  }
}

/**
 * Middleware de autorización para administradores
 * Verifica que el usuario tenga rol de admin
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Se requiere rol de administrador'
    });
  }
  next();
}

/**
 * Middleware opcional de autenticación
 * No falla si no hay token, pero agrega el usuario si existe
 */
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyJWT(token);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    console.warn('Token inválido en optionalAuth');
    next();
  }
}

/**
 * Middleware de autorización para vendedores o administradores
 * Verifica que el usuario tenga rol de vendedor o admin
 */
export function requireSellerOrAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'cajero')) {
    return res.status(403).json({
      success: false,
      error: 'Se requiere rol de vendedor o administrador'
    });
  }
  next();
}
