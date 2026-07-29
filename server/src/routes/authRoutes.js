import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limit para login (protección básica contra fuerza bruta)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 intentos por IP
  message: { success: false, message: 'Demasiados intentos, intenta más tarde' }
});

// Validación básica de input
function validateLogin(req, res, next) {
  const { username, password, usuario, contraseña } = req.body || {};

  const user = username || usuario;
  const pass = password || contraseña;

  if (!user || !pass) {
    return res.status(400).json({
      success: false,
      message: 'Usuario y contraseña son requeridos'
    });
  }

  if (typeof user !== 'string' || typeof pass !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Formato inválido'
    });
  }

  next();
}

// Rutas públicas
router.post('/login', loginLimiter, validateLogin, authController.login);

// Rutas protegidas
router.post('/logout', authenticateToken, authController.logout);
router.get('/verify', authenticateToken, authController.verifyToken);

export default router;
