import { query, queryOne, run } from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { logAction } from './logService.js';

/**
 * Servicio de Autenticación
 * Maneja la lógica de autenticación y autorización
 */

/**
 * Autentica un usuario con usuario y contraseña
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña
 * @returns {Object} Token y datos del usuario
 */
export async function login(username, password) {
  try {
    const normalizedUsername = String(username).toLowerCase();
    // Buscar usuario por nombre de usuario
    const user = await queryOne(
      'SELECT * FROM usuarios WHERE LOWER(usuario) = ? AND activo = 1',
      [normalizedUsername]
    );

    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.contraseña_hash);

    if (!isValidPassword) {
      throw new Error('Credenciales inválidas');
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.usuario,
        role: user.rol
      },
      config.jwtSecret,
      { expiresIn: '8h' }
    );

    // Registrar login
    await logAction(user.id, 'LOGIN', 'Usuario inició sesión');

    // Retornar datos sin contraseña
    const { contraseña_hash, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword
    };
  } catch (error) {
    console.error('Error en login:', error.message);
    throw error;
  }
}

/**
 * Verifica un token JWT
 * @param {string} token - Token JWT
 * @returns {Object} Datos decodificados del token
 */
export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    return decoded;
  } catch (error) {
    console.error('Error al verificar token:', error);
    throw new Error('Token inválido o expirado');
  }
}

/**
 * Registra el logout de un usuario
 * @param {number} userId - ID del usuario
 */
export async function logout(userId) {
  try {
    await logAction(userId, 'LOGOUT', 'Usuario cerró sesión');
  } catch (error) {
    console.error('Error al registrar logout:', error);
    throw error;
  }
}

/**
 * Crea un nuevo usuario
 * @param {Object} userData - Datos del usuario
 * @param {number} creatorId - ID del usuario que crea
 * @returns {Object} Usuario creado
 */
export async function createUser(userData, creatorId = null) {
  try {
    let { nombre, usuario, contraseña, rol = 'cajero' } = userData;
    usuario = String(usuario).toLowerCase();

    const allowedRoles = ['admin', 'cajero'];
    if (!allowedRoles.includes(rol)) {
      throw new Error('Rol inválido');
    }

    // Verificar si el usuario ya existe
    const existingUser = await queryOne(
      'SELECT id FROM usuarios WHERE usuario = ?',
      [usuario]
    );

    if (existingUser) {
      throw new Error('El nombre de usuario ya existe');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(contraseña, 10);

    // Insertar usuario
    const result = await run(
      'INSERT INTO usuarios (nombre, usuario, contraseña_hash, rol) VALUES (?, ?, ?, ?)',
      [nombre, usuario, hashedPassword, rol]
    );

    // Registrar acción
    await logAction(creatorId, 'CREAR_USUARIO', `Usuario creado: ${usuario}`);

    // Retornar usuario sin contraseña
    const newUser = await queryOne('SELECT id, nombre, usuario, rol, activo, created_at FROM usuarios WHERE id = ?', [result.id]);

    return newUser;
  } catch (error) {
    console.error('Error al crear usuario:', error.message);
    throw error;
  }
}

/**
 * Actualiza un usuario existente
 * @param {number} id - ID del usuario
 * @param {Object} userData - Datos a actualizar
 * @param {number} updaterId - ID del usuario que actualiza
 * @returns {Object} Usuario actualizado
 */
export async function updateUser(id, userData, updaterId = null) {
  try {
    let { nombre, usuario, contraseña, rol, activo } = userData;

    // Construir query dinámica
    const updates = [];
    const params = [];

    if (nombre !== undefined) {
      updates.push('nombre = ?');
      params.push(nombre);
    }

    if (usuario !== undefined) {
      const normalized = String(usuario).toLowerCase();
      // verificar duplicado
      const existing = await queryOne('SELECT id FROM usuarios WHERE LOWER(usuario) = ? AND id != ?', [normalized, id]);
      if (existing) {
        throw new Error('El nombre de usuario ya existe');
      }
      updates.push('usuario = ?');
      params.push(normalized);
    }

    if (contraseña !== undefined) {
      updates.push('contraseña_hash = ?');
      params.push(await bcrypt.hash(contraseña, 10));
    }

    if (rol !== undefined) {
      updates.push('rol = ?');
      params.push(rol);
    }

    if (activo !== undefined) {
      updates.push('activo = ?');
      params.push(activo);
    }

    if (updates.length === 0) {
      throw new Error('No hay datos para actualizar');
    }

    params.push(id);

    await run(
      `UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Registrar acción
    await logAction(updaterId, 'ACTUALIZAR_USUARIO', `Usuario actualizado: ${usuario}`);

    // Retornar usuario actualizado sin contraseña
    const updatedUser = await queryOne(
      'SELECT id, nombre, usuario, rol, activo, created_at FROM usuarios WHERE id = ?',
      [id]
    );

    return updatedUser;
  } catch (error) {
    console.error('Error al actualizar usuario:', error.message);
    throw error;
  }
}

/**
 * Obtiene todos los usuarios
 * @returns {Array} Lista de usuarios
 */
export async function getUsers() {
  try {
    const users = await query(
      'SELECT id, nombre, usuario, rol, activo, created_at FROM usuarios ORDER BY nombre'
    );
    return users;
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    throw error;
  }
}

/**
 * Obtiene un usuario por su ID
 * @param {number} id - ID del usuario
 * @returns {Object} Usuario encontrado
 */
export async function getUserById(id) {
  try {
    const user = await queryOne(
      'SELECT id, nombre, usuario, rol, activo, created_at FROM usuarios WHERE id = ?',
      [id]
    );
    return user;
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    throw error;
  }
}

/**
 * Verifica la contraseña de un usuario
 * @param {number} userId - ID del usuario
 * @param {string} password - Contraseña a verificar
 * @returns {boolean} True si la contraseña es correcta
 */
export async function verifyUserPassword(userId, password) {
  try {
    const user = await queryOne(
      'SELECT contraseña_hash FROM usuarios WHERE id = ? AND activo = 1',
      [userId]
    );

    if (!user) {
      return false;
    }

    const isValidPassword = await bcrypt.compare(password, user.contraseña_hash);
    return isValidPassword;
  } catch (error) {
    console.error('Error al verificar contraseña:', error);
    return false;
  }
}
