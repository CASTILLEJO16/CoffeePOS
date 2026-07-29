import * as authService from '../services/authService.js';
import { logAction } from '../services/logService.js';

/**
 * Controlador de Autenticación
 * Maneja las requests HTTP relacionadas con autenticación
 */

/**
 * Inicia sesión
 */
export async function login(req, res) {
  try {
    const { usuario, contraseña } = req.body;

    if (!usuario || !contraseña) {
      return res.status(400).json({
        success: false,
        error: 'Usuario y contraseña son requeridos'
      });
    }

    const result = await authService.login(usuario, contraseña);

    // Registrar inicio de sesión
    await logAction(result.user.id, 'LOGIN', `Usuario ${usuario} inició sesión`);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Cierra sesión
 */
export async function logout(req, res) {
  try {
    const userId = req.user?.userId;

    if (userId) {
      await authService.logout(userId);
      // Registrar cierre de sesión
      await logAction(userId, 'LOGOUT', 'Usuario cerró sesión');
    }

    res.json({
      success: true,
      message: 'Sesión cerrada correctamente'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Verifica el token actual
 */
export async function verifyToken(req, res) {
  try {
    // Si llegamos aquí, el middleware ya verificó el token
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Error en verifyToken:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
