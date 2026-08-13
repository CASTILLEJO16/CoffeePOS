import { query, queryOne, run } from '../config/database.js';
import { nowInTijuanaSQL } from '../utils/dateTime.js';
import { getBranchId } from '../utils/branchContext.js';

/**
 * Servicio de Cajas
 * Contiene toda la lógica de negocio relacionada con cajas
 */

/**
 * Obtiene la caja abierta de un usuario
 * @param {number} usuarioId - ID del usuario
 * @returns {Object|null} Caja abierta o null
 */
export async function getOpenCashRegisterByUser(usuarioId) {
  try {
    const branchId = getBranchId();
    const cashRegister = await queryOne(
      `SELECT c.*, u.nombre as usuario_nombre 
       FROM cajas c
       LEFT JOIN usuarios u ON c.usuario_id = u.id
       WHERE c.usuario_id = ? AND c.estado = 'abierta' AND c.branch_id = ?
       ORDER BY c.fecha_apertura DESC
       LIMIT 1`,
      [usuarioId, branchId]
    );

    return cashRegister;
  } catch (error) {
    console.error('Error al obtener caja abierta:', error);
    throw error;
  }
}

/**
 * Obtiene una caja por su ID
 * @param {number} id - ID de la caja
 * @returns {Object|null} Caja o null
 */
export async function getCashRegisterById(id) {
  try {
    const branchId = getBranchId();
    const cashRegister = await queryOne(
      `SELECT c.*, u.nombre as usuario_nombre 
       FROM cajas c
       LEFT JOIN usuarios u ON c.usuario_id = u.id
       WHERE c.id = ? AND c.branch_id = ?`,
      [id, branchId]
    );

    return cashRegister;
  } catch (error) {
    console.error('Error al obtener caja:', error);
    throw error;
  }
}

/**
 * Abre una nueva caja
 * @param {Object} data - Datos de la caja
 * @returns {Object} Caja creada
 */
export async function openCashRegister(data) {
  try {
    const { usuario_id, nombre_caja, fondo_inicial, observaciones } = data;
    const fecha_apertura = nowInTijuanaSQL();
    const branchId = getBranchId();

    const existing = await getOpenCashRegisterByUser(usuario_id);
    if (existing) {
      throw new Error('Ya hay una caja abierta para este usuario');
    }

    // Evitar que la misma caja (por nombre) sea usada por otro usuario
    if (nombre_caja) {
      const cajaEnUso = await queryOne(
        `SELECT id FROM cajas WHERE nombre_caja = ? AND estado = 'abierta' LIMIT 1`,
        [nombre_caja]
      );

      if (cajaEnUso) {
        throw new Error('Esta caja ya está en uso por otro usuario');
      }
    }

    const result = await run(
      `INSERT INTO cajas (usuario_id, nombre_caja, fondo_inicial, observaciones, estado, fecha_apertura, branch_id)
       VALUES (?, ?, ?, ?, 'abierta', ?, ?)`,
      [usuario_id, nombre_caja, fondo_inicial, observaciones, fecha_apertura, branchId]
    );

    return await getCashRegisterById(result.id);
  } catch (error) {
    console.error('Error al abrir caja:', error);
    throw error;
  }
}

/**
 * Cierra una caja
 * @param {number} id - ID de la caja
 * @param {Object} data - Datos del cierre
 * @returns {Object} Caja cerrada
 */
export async function closeCashRegister(id, data) {
  try {
    const { total_contado, observaciones } = data;

    await run('BEGIN TRANSACTION');

    const caja = await getCashRegisterById(id);
    if (!caja) throw new Error('Caja no encontrada');
    if (caja.estado !== 'abierta') throw new Error('La caja ya está cerrada');

    const sales = await query(
      `SELECT metodo_pago, SUM(total) as total, SUM(monto_dolar) as monto_dolar
       FROM ventas
       WHERE caja_id = ? AND cancelada = 0
       GROUP BY metodo_pago`,
      [id]
    );

    let ventas_efectivo = 0;
    let ventas_tarjeta = 0;
    let ventas_transferencia = 0;
    let ventas_otros = 0;
    let ventas_dolar = 0;
    let total_dolar = 0;

    sales.forEach(sale => {
      switch (sale.metodo_pago?.toLowerCase()) {
        case 'efectivo': ventas_efectivo = sale.total || 0; break;
        case 'tarjeta':
        case 'credito':
        case 'debito': ventas_tarjeta = sale.total || 0; break;
        case 'transferencia': ventas_transferencia = sale.total || 0; break;
        case 'dolar':
          ventas_dolar = sale.total || 0;
          total_dolar = sale.monto_dolar || 0;
          break;
        default: ventas_otros += sale.total || 0;
      }
    });

    // Calcular total de descuentos desde los detalles de ventas
    const discountDetails = await query(
      `SELECT d.precio, d.cantidad, d.descuento
       FROM detalle_ventas d
       JOIN ventas v ON d.venta_id = v.id
       WHERE v.caja_id = ? AND v.cancelada = 0 AND d.descuento > 0`,
      [id]
    );

    let total_descuentos = 0;
    discountDetails.forEach(detail => {
      const discountAmount = detail.precio * (detail.descuento / 100) * detail.cantidad;
      total_descuentos += discountAmount;
    });
    total_descuentos = Number(total_descuentos.toFixed(2));

    const total_devoluciones = 0;

    const total_esperado =
      ventas_efectivo + ventas_tarjeta + ventas_transferencia + ventas_otros + ventas_dolar;

    const diferencia = Number((total_contado - total_esperado).toFixed(2));

    const fecha_cierre = nowInTijuanaSQL();

    await run(
      `UPDATE cajas 
       SET fecha_cierre = ?,
           ventas_efectivo = ?,
           ventas_tarjeta = ?,
           ventas_transferencia = ?,
           ventas_otros = ?,
           ventas_dolar = ?,
           total_dolar = ?,
           total_descuentos = ?,
           total_devoluciones = ?,
           total_esperado = ?,
           total_contado = ?,
           diferencia = ?,
           observaciones = ?,
           estado = 'cerrada'
       WHERE id = ?`,
      [
        fecha_cierre,
        ventas_efectivo,
        ventas_tarjeta,
        ventas_transferencia,
        ventas_otros,
        ventas_dolar,
        total_dolar,
        total_descuentos,
        total_devoluciones,
        total_esperado,
        total_contado,
        diferencia,
        observaciones,
        id
      ]
    );

    const result = await getCashRegisterById(id);
    await run('COMMIT');
    return result;
  } catch (error) {
    await run('ROLLBACK');
    console.error('Error al cerrar caja:', error.message);
    throw error;
  }
}

/**
 * Obtiene el resumen de ventas de una caja
 * @param {number} cajaId - ID de la caja
 * @returns {Object} Resumen de ventas
 */
export async function getSalesSummaryByCashRegister(cajaId) {
  try {
    const branchId = getBranchId();
    // Obtener ventas por método de pago
    const salesByMethod = await query(
      `SELECT 
         metodo_pago,
         SUM(total) as total
       FROM ventas
       WHERE caja_id = ? AND cancelada = 0 AND branch_id = ?
       GROUP BY metodo_pago`,
      [cajaId, branchId]
    );

    let ventas_efectivo = 0;
    let ventas_tarjeta = 0;
    let ventas_transferencia = 0;
    let ventas_otros = 0;
    let ventas_dolar = 0;
    let total_dolar = 0;

    salesByMethod.forEach(sale => {
      switch (sale.metodo_pago?.toLowerCase()) {
        case 'efectivo':
          ventas_efectivo = sale.total || 0;
          break;
        case 'tarjeta':
        case 'credito':
        case 'debito':
          ventas_tarjeta = sale.total || 0;
          break;
        case 'transferencia':
          ventas_transferencia = sale.total || 0;
          break;
        case 'usd':
        case 'dolar':
          // Las ventas en USD se suman al efectivo (en pesos)
          ventas_efectivo += sale.total || 0;
          ventas_dolar = sale.total || 0;
          break;
        default:
          ventas_otros += sale.total || 0;
      }
    });

    // Obtener el total en dólares (monto original en USD)
    const dollarSales = await query(
      `SELECT SUM(monto_dolar) as total_dolar
       FROM ventas
       WHERE caja_id = ? AND cancelada = 0 AND metodo_pago IN ('usd', 'dolar') AND branch_id = ?`,
      [cajaId, branchId]
    );
    total_dolar = dollarSales[0]?.total_dolar || 0;

    // Calcular total de descuentos desde los detalles de ventas
    const discountDetails = await query(
      `SELECT d.precio, d.cantidad, d.descuento
       FROM detalle_ventas d
       JOIN ventas v ON d.venta_id = v.id
       WHERE v.caja_id = ? AND v.cancelada = 0 AND d.descuento > 0`,
      [cajaId]
    );

    let total_descuentos = 0;
    discountDetails.forEach(detail => {
      const discountAmount = detail.precio * (detail.descuento / 100) * detail.cantidad;
      total_descuentos += discountAmount;
    });
    total_descuentos = Number(total_descuentos.toFixed(2));

    // Obtener total de devoluciones de la caja
    const cashRegister = await queryOne(
      'SELECT total_devoluciones FROM cajas WHERE id = ?',
      [cajaId]
    );
    const total_devoluciones = cashRegister?.total_devoluciones || 0;

    return {
      ventas_efectivo,
      ventas_tarjeta,
      ventas_transferencia,
      ventas_otros,
      ventas_dolar,
      total_dolar,
      total_descuentos,
      total_devoluciones
    };
  } catch (error) {
    console.error('Error al obtener resumen de ventas:', error);
    throw error;
  }
}

/**
 * Obtiene todas las cajas con filtros opcionales
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Array} Lista de cajas
 */
export async function getAllCashRegisters(filters = {}) {
  try {
    const branchId = getBranchId();
    const { startDate, endDate, estado, usuario_id } = filters;

    let sql = `SELECT c.*, u.nombre as usuario_nombre
               FROM cajas c
               LEFT JOIN usuarios u ON c.usuario_id = u.id
               WHERE c.branch_id = ?`;

    const params = [branchId];

    if (startDate) {
      sql += ` AND DATE(c.fecha_apertura) >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND DATE(c.fecha_apertura) <= ?`;
      params.push(endDate);
    }

    if (estado) {
      sql += ` AND c.estado = ?`;
      params.push(estado);
    }

    if (usuario_id) {
      sql += ` AND c.usuario_id = ?`;
      params.push(usuario_id);
    }

    sql += ` ORDER BY c.fecha_apertura DESC`;

    const cashRegisters = await query(sql, params);
    return cashRegisters;
  } catch (error) {
    console.error('Error al obtener cajas:', error);
    throw error;
  }
}

/**
 * Obtiene todas las cajas de un usuario específico
 * @param {number} usuarioId - ID del usuario
 * @returns {Array} Lista de cajas del usuario
 */
export async function getCashRegistersByUser(usuarioId) {
  try {
    const branchId = getBranchId();
    const sql = `SELECT c.*, u.nombre as usuario_nombre
                 FROM cajas c
                 LEFT JOIN usuarios u ON c.usuario_id = u.id
                 WHERE c.usuario_id = ? AND c.branch_id = ?
                 ORDER BY c.fecha_apertura DESC`;
    const cashRegisters = await query(sql, [usuarioId, branchId]);
    return cashRegisters;
  } catch (error) {
    console.error('Error al obtener cajas del usuario:', error);
    throw error;
  }
}

/**
 * Actualiza el ID de caja en una venta
 * @param {number} ventaId - ID de la venta
 * @param {number} cajaId - ID de la caja
 */
export async function updateSaleCashRegister(ventaId, cajaId) {
  try {
    await run(
      'UPDATE ventas SET caja_id = ? WHERE id = ?',
      [cajaId, ventaId]
    );
  } catch (error) {
    console.error('Error al actualizar caja de venta:', error);
    throw error;
  }
}
