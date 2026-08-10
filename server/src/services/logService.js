import { query, run } from '../config/database.js';
import { nowInTijuanaSQL } from '../utils/dateTime.js';

/**
 * Servicio de Logs
 * Maneja el registro de actividades en el sistema
 */

/**
 * Registra una acción en el sistema
 * @param {number} usuarioId - ID del usuario (opcional)
 * @param {string} accion - Descripción de la acción
 * @param {string} detalles - Detalles adicionales (opcional)
 */
export async function logAction(usuarioId, accion, detalles = null) {
  try {
    const fecha = nowInTijuanaSQL();
    await run(
      'INSERT INTO logs (usuario_id, accion, detalles, fecha) VALUES (?, ?, ?, ?)',
      [usuarioId, accion, detalles, fecha]
    );
  } catch (error) {
    console.error('Error al registrar log:', error);
  }
}

/**
 * Obtiene el historial de logs
 * @param {number} limit - Límite de registros a retornar
 * @returns {Array} Lista de logs
 */
export async function getLogs(limit = 100) {
  try {
    const logs = await query(
      `SELECT l.*, u.nombre as usuario_nombre, u.usuario as usuario_username
       FROM logs l
       LEFT JOIN usuarios u ON l.usuario_id = u.id
       ORDER BY l.fecha DESC
       LIMIT ?`,
      [limit]
    );
    return logs;
  } catch (error) {
    console.error('Error al obtener logs:', error);
    throw error;
  }
}

/**
 * Obtiene logs de un usuario específico
 * @param {number} usuarioId - ID del usuario
 * @returns {Array} Lista de logs del usuario
 */
export async function getLogsByUser(usuarioId) {
  try {
    const logs = await query(
      `SELECT * FROM logs WHERE usuario_id = ? ORDER BY fecha DESC`,
      [usuarioId]
    );
    return logs;
  } catch (error) {
    console.error('Error al obtener logs del usuario:', error);
    throw error;
  }
}

/**
 * Obtiene logs con filtros avanzados
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Array} Lista de logs filtrados
 */
export async function getLogsWithFilters(filters = {}) {
  try {
    const { accion, usuarioId, startDate, endDate, limit = 100 } = filters;
    
    let sql = `SELECT l.*, u.nombre as usuario_nombre, u.usuario as usuario_username
               FROM logs l
               LEFT JOIN usuarios u ON l.usuario_id = u.id
               WHERE 1=1`;
    
    const params = [];

    if (accion) {
      sql += ` AND l.accion = ?`;
      params.push(accion);
    }

    if (usuarioId) {
      sql += ` AND l.usuario_id = ?`;
      params.push(usuarioId);
    }

    if (startDate) {
      sql += ` AND DATE(l.fecha) >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND DATE(l.fecha) <= ?`;
      params.push(endDate);
    }

    sql += ` ORDER BY l.fecha DESC LIMIT ?`;
    params.push(limit);

    const logs = await query(sql, params);
    return logs;
  } catch (error) {
    console.error('Error al obtener logs con filtros:', error);
    throw error;
  }
}

/**
 * Obtiene el resumen de actividades por tipo
 * @returns {Object} Resumen de actividades
 */
export async function getActivitySummary() {
  try {
    const summary = await query(
      `SELECT 
         accion,
         COUNT(*) as total,
         DATE(fecha) as fecha
       FROM logs
       WHERE DATE(fecha) = DATE('now')
       GROUP BY accion, DATE(fecha)`
    );
    return summary;
  } catch (error) {
    console.error('Error al obtener resumen de actividades:', error);
    throw error;
  }
}
