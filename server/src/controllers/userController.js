import * as authService from '../services/authService.js';
import { logAction } from '../services/logService.js';

/**
 * Controlador de Usuarios
 * Maneja las requests HTTP relacionadas con usuarios
 */

/**
 * Obtiene todos los usuarios
 */
export async function getUsers(req, res) {
  try {
    const users = await authService.getUsers();

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error en getUsers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Obtiene un usuario por ID
 */
export async function getUser(req, res) {
  try {
    const { id } = req.params;
    const user = await authService.getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error en getUser:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Crea un nuevo usuario
 */
export async function createUser(req, res) {
  try {
    const userData = req.body;
    const creatorId = req.user?.userId;

    const user = await authService.createUser(userData, creatorId);

    // Registrar creación de usuario
    await logAction(creatorId, 'CREAR_USUARIO', `Usuario creado: ${userData.nombre} (${userData.usuario})`);

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error en createUser:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Actualiza un usuario existente
 */
export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const userData = req.body;
    const updaterId = req.user?.userId;

    const user = await authService.updateUser(id, userData, updaterId);

    // Registrar actualización de usuario
    await logAction(updaterId, 'ACTUALIZAR_USUARIO', `Usuario actualizado: ID ${id}`);

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error en updateUser:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Activa un usuario
 */
export async function activateUser(req, res) {
  try {
    const { id } = req.params;
    const updaterId = req.user?.userId;
    const user = await authService.updateUser(id, { activo: 1 }, updaterId);
    res.json({ success: true, data: user, message: 'Usuario activado correctamente' });
  } catch (error) {
    console.error('Error en activateUser:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Desactiva un usuario
 */
export async function deactivateUser(req, res) {
  try {
    const { id } = req.params;
    const updaterId = req.user?.userId;
    const user = await authService.updateUser(id, { activo: 0 }, updaterId);
    res.json({ success: true, data: user, message: 'Usuario desactivado correctamente' });
  } catch (error) {
    console.error('Error en deactivateUser:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

