import { query, queryOne, run } from '../config/database.js';
import { config } from '../config/config.js';
import { logAction } from './logService.js';
import { getOpenCashRegisterByUser } from './cashRegisterService.js';
import { nowInTijuanaSQL } from '../utils/dateTime.js';
import { getBranchId } from '../utils/branchContext.js';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Servicio de Ventas
 * Contiene toda la lógica de negocio relacionada con ventas
 */

/**
 * Obtiene todas las ventas
 * @param {number} limit - Límite de registros
 * @param {number} offset - Offset para paginación
 * @param {number} usuarioId - ID del usuario (opcional, para filtrar)
 * @returns {Array} Lista de ventas
 */
export async function getSales(limit = 100, offset = 0, usuarioId = null) {
  try {
    const branchId = getBranchId();
    let sql, params;

    if (usuarioId) {
      sql = `SELECT v.*, u.nombre as usuario_nombre
             FROM ventas v
             LEFT JOIN usuarios u ON v.usuario_id = u.id
             WHERE v.usuario_id = ? AND v.branch_id = ? AND v.cancelada = 0
             ORDER BY v.fecha DESC
             LIMIT ? OFFSET ?`;
      params = [usuarioId, branchId, limit, offset];
    } else {
      sql = `SELECT v.*, u.nombre as usuario_nombre
             FROM ventas v
             LEFT JOIN usuarios u ON v.usuario_id = u.id
             WHERE v.branch_id = ? AND v.cancelada = 0
             ORDER BY v.fecha DESC
             LIMIT ? OFFSET ?`;
      params = [branchId, limit, offset];
    }

    const sales = await query(sql, params);
    return sales;
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    throw error;
  }
}

/**
 * Obtiene todas las ventas de un usuario específico
 * @param {number} usuarioId - ID del usuario
 * @returns {Array} Lista de ventas del usuario
 */
export async function getSalesByUser(usuarioId) {
  try {
    const branchId = getBranchId();
    const sql = `SELECT v.*, u.nombre as usuario_nombre
                 FROM ventas v
                 LEFT JOIN usuarios u ON v.usuario_id = u.id
                 WHERE v.usuario_id = ? AND v.branch_id = ? AND v.cancelada = 0
                 ORDER BY v.fecha DESC`;
    const sales = await query(sql, [usuarioId, branchId]);
    return sales;
  } catch (error) {
    console.error('Error al obtener ventas del usuario:', error);
    throw error;
  }
}

/**
 * Obtiene una venta por su ID con sus detalles
 * @param {number} id - ID de la venta
 * @returns {Object} Venta con detalles
 */
export async function getSaleById(id) {
  try {
    const branchId = getBranchId();
    const sale = await queryOne(
      `SELECT v.*, u.nombre as usuario_nombre 
       FROM ventas v
       LEFT JOIN usuarios u ON v.usuario_id = u.id
       WHERE v.id = ? AND v.branch_id = ?`,
      [id, branchId]
    );

    if (!sale) {
      return null;
    }

    const details = await query(
      `SELECT d.*, p.nombre as producto_nombre 
       FROM detalle_ventas d
       JOIN productos p ON d.producto_id = p.id
       WHERE d.venta_id = ?`,
      [id]
    );

    // Parsear personalizaciones de JSON
    const detailsWithParsedCustomizations = details.map(detail => ({
      ...detail,
      personalizaciones: detail.personalizaciones ? JSON.parse(detail.personalizaciones) : null
    }));

    return {
      ...sale,
      detalles: detailsWithParsedCustomizations
    };
  } catch (error) {
    console.error('Error al obtener venta:', error);
    throw error;
  }
}

/**
 * Crea una nueva venta con sus detalles
 * @param {Object} saleData - Datos de la venta
 * @param {number} usuarioId - ID del usuario
 * @returns {Object} Venta creada con detalles
 */
export async function createSale(saleData, usuarioId = null) {
  try {
    await run('BEGIN TRANSACTION');
    const branchId = getBranchId();
    const { items, metodo_pago = 'efectivo', iva_rate: ivaFromClient } = saleData;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('La venta debe tener al menos un producto');
    }

    // Obtener caja abierta del usuario
    const openCashRegister = await getOpenCashRegisterByUser(usuarioId);
    if (!openCashRegister) {
      throw new Error('No hay una caja abierta. Debe abrir una caja antes de realizar ventas.');
    }

    // Calcular totales
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      if (!item.cantidad || item.cantidad <= 0) {
        throw new Error('Cantidad inválida');
      }
      const product = await queryOne(
        'SELECT * FROM productos WHERE id = ? AND activo = 1',
        [item.producto_id]
      );

      if (!product) {
        throw new Error(`Producto con ID ${item.producto_id} no encontrado o inactivo`);
      }

      const cantidad = item.cantidad;
      // Usar el precio unitario del cliente (incluye personalizaciones) o el precio base del producto
      // ✅ Usar precio del frontend si incluye personalizaciones
      let precio = product.precio;
      if (item.precio_final !== undefined && item.precio_final !== null) {
        const parsed = parseFloat(item.precio_final);
        if (!Number.isNaN(parsed) && parsed > 0) {
          precio = parsed;
        }
      }

      const importe = cantidad * precio;
      const personalizaciones = item.personalizaciones ? JSON.stringify(item.personalizaciones) : null;

      subtotal += importe;

      processedItems.push({
        producto_id: product.id,
        producto_nombre: product.nombre,
        cantidad,
        precio,
        importe,
        personalizaciones
      });

      // 🔥 Verificar si el producto tiene receta
      const receta = await queryOne(
        'SELECT 1 FROM recetas WHERE producto_id = ? LIMIT 1',
        [product.id]
      );

      // ✅ Solo descontar stock si NO tiene receta
      if (!receta) {
        try {
          if (product.stock !== undefined && product.stock !== null) {
            const newStock = product.stock - cantidad;
            await run(
              'UPDATE productos SET stock = ? WHERE id = ?',
              [newStock, product.id]
            );
          }
        } catch (e) {
          console.error('Error actualizando stock de producto:', e);
        }
      }
    }

    // Calcular impuestos y total
    // IVA dinámico desde configuración
    // ✅ Priorizar IVA enviado desde frontend (tiempo real)
    let ivaRate = 0.16;
    if (ivaFromClient !== undefined && ivaFromClient !== null) {
      const parsed = parseFloat(ivaFromClient);
      if (!Number.isNaN(parsed)) {
        ivaRate = parsed;
      }
    } else {
      // fallback: configuración en BD
      try {
        const ivaRow = await queryOne("SELECT valor FROM configuracion WHERE clave = 'iva_rate'");
        if (ivaRow && ivaRow.valor) {
          ivaRate = parseFloat(ivaRow.valor);
        }
      } catch {}
    }

    const impuestos = Number((subtotal * ivaRate).toFixed(2));
    const total = Number((subtotal + impuestos).toFixed(2));

    // ========== LOGICA DE ALMACEN ==========
    const configRow = await queryOne("SELECT valor FROM configuracion WHERE clave = 'permitir_stock_negativo'");
    const allowNegativeStock = configRow ? configRow.valor === '1' || configRow.valor === 'true' : false;
    
    const ingredientNeeds = {}; // { [ingId]: { nombre, cantidad, unidad_medida } }

    for (const item of items) {
      const qty = item.cantidad;
      
      // 1. Obtener la receta base
      const baseRecipe = await query(`
        SELECT r.ingrediente_id, r.cantidad, i.nombre, i.unidad_medida, i.categoria_reemplazo
        FROM recetas r
        JOIN ingredientes i ON r.ingrediente_id = i.id
        WHERE r.producto_id = ? AND i.activo = 1
      `, [item.producto_id]);

      // 2. Revisar personalizaciones seleccionadas
      const categoriesToReplace = new Set();
      const customRecipesToApply = [];

      if (item.personalizaciones) {
        let opcionesSeleccionadas = [];
        if (Array.isArray(item.personalizaciones)) {
          opcionesSeleccionadas = item.personalizaciones;
        } else if (typeof item.personalizaciones === 'object') {
          opcionesSeleccionadas = Object.values(item.personalizaciones).flat();
        }

        for (const opcion of opcionesSeleccionadas) {
          if (!opcion?.id) continue;
          
          // Obtener el tipo de personalización
          const customDb = await queryOne('SELECT tipo FROM personalizaciones WHERE id = ? AND activo = 1', [opcion.id]);
          if (customDb && customDb.tipo) {
            categoriesToReplace.add(customDb.tipo);
          }

          // Obtener los ingredientes que añade esta personalización
          const custRecipe = await query(`
            SELECT rp.ingrediente_id, rp.cantidad, i.nombre, i.unidad_medida
            FROM recetas_personalizacion rp
            JOIN ingredientes i ON rp.ingrediente_id = i.id
            WHERE rp.personalizacion_id = ? AND i.activo = 1
          `, [opcion.id]);
          
          customRecipesToApply.push(...custRecipe);
        }
      }

      // 3. Crear receta temporal excluyendo las categorías reemplazadas
      const finalBaseRecipe = baseRecipe.filter(br => {
        if (br.categoria_reemplazo && categoriesToReplace.has(br.categoria_reemplazo)) {
          return false; // El cliente seleccionó una personalización de esta categoría, eliminar ingrediente base
        }
        return true; // Conservar ingrediente
      });

      // Añadir ingredientes de la receta base final
      for (const row of finalBaseRecipe) {
        const key = row.ingrediente_id;
        if (!ingredientNeeds[key]) {
          ingredientNeeds[key] = { nombre: row.nombre, unidad_medida: row.unidad_medida, cantidad: 0 };
        }
        ingredientNeeds[key].cantidad += row.cantidad * qty;
      }

      // Añadir ingredientes de las personalizaciones (extras o sustitutos)
      for (const row of customRecipesToApply) {
        const key = row.ingrediente_id;
        if (!ingredientNeeds[key]) {
          ingredientNeeds[key] = { nombre: row.nombre, unidad_medida: row.unidad_medida, cantidad: 0 };
        }
        ingredientNeeds[key].cantidad += row.cantidad * qty;
      }
    } // fin loop items
    
    // --- VERIFICAR DISPONIBILIDAD ---
    const faltantes = [];
    for (const [ingId, need] of Object.entries(ingredientNeeds)) {
      if (need.cantidad <= 0) continue;
      const ingRow = await queryOne("SELECT stock_actual, unidad_medida FROM ingredientes WHERE id = ?", [ingId]);
      if (ingRow && ingRow.stock_actual < need.cantidad && !allowNegativeStock) {
        faltantes.push(`${need.nombre} (tiene ${ingRow.stock_actual}${need.unidad_medida}, necesita ${need.cantidad}${need.unidad_medida})`);
      }
    }
    if (faltantes.length > 0) {
      throw new Error(`Stock insuficiente para procesar la venta. Ingredientes faltantes:\n${faltantes.join('\n')}`);
    }
    
    // --- DESCONTAR STOCKS ---
    for (const [ingId, need] of Object.entries(ingredientNeeds)) {
      if (need.cantidad <= 0) continue;
      await run("UPDATE ingredientes SET stock_actual = stock_actual - ? WHERE id = ?", [need.cantidad, ingId]);
    }
    // ==========================================

    // Insertar venta con caja_id y hora de Tijuana
    const fecha = nowInTijuanaSQL();
    console.log('🔍 Creando venta con fecha:', fecha);
    const saleResult = await run(
      'INSERT INTO ventas (subtotal, impuestos, total, metodo_pago, tipo_tarjeta, usuario_id, caja_id, fecha, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [subtotal, impuestos, total, metodo_pago, saleData.tipo_tarjeta || null, usuarioId, openCashRegister.id, fecha, branchId]
    );

    const ventaId = saleResult.id;

    // Insertar detalles
    for (const item of processedItems) {
      await run(
        'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio, importe, personalizaciones) VALUES (?, ?, ?, ?, ?, ?)',
        [ventaId, item.producto_id, item.cantidad, item.precio, item.importe, item.personalizaciones]
      );
    }

    // Registrar log
    await logAction(usuarioId, 'CREAR_VENTA', `Venta creada: #${ventaId}, Total: $${total.toFixed(2)}, Caja: #${openCashRegister.id}`);

    // Retornar venta completa
    const result = await getSaleById(ventaId);
    // adjuntar iva usado para ticket/frontend
    result.iva_rate = ivaRate;

    await run('COMMIT');
    return result;
  } catch (error) {
    await run('ROLLBACK');
    console.error('Error al crear venta:', error.message);
    throw error;
  }
}

/**
 * Cancela una venta (marca como cancelada en log)
 * @param {number} id - ID de la venta
 * @param {number} usuarioId - ID del usuario que cancela
 */
export async function cancelSale(id, usuarioId = null) {
  try {
    await run('BEGIN TRANSACTION');
    const sale = await getSaleById(id);
    
    if (!sale) {
      throw new Error('Venta no encontrada');
    }

    if (sale.cancelada) {
      throw new Error('La venta ya fue cancelada');
    }

    // Revertir stock de ingredientes basado en detalles
    const ingredientMap = {};

    for (const item of sale.detalles) {
      const qty = item.cantidad;

      const baseRecipe = await query(
        `SELECT r.ingrediente_id, r.cantidad
         FROM recetas r
         WHERE r.producto_id = ?`,
        [item.producto_id]
      );

      for (const row of baseRecipe) {
        if (!ingredientMap[row.ingrediente_id]) {
          ingredientMap[row.ingrediente_id] = 0;
        }
        ingredientMap[row.ingrediente_id] += row.cantidad * qty;
      }

      if (item.personalizaciones) {
        let opciones = [];
        try {
          opciones = Array.isArray(item.personalizaciones)
            ? item.personalizaciones
            : Object.values(item.personalizaciones).flat();
        } catch {
          opciones = [];
        }

        for (const opcion of opciones) {
          if (!opcion?.id) continue;

          const custRecipe = await query(
            `SELECT ingrediente_id, cantidad
             FROM recetas_personalizacion
             WHERE personalizacion_id = ?`,
            [opcion.id]
          );

          for (const row of custRecipe) {
            if (!ingredientMap[row.ingrediente_id]) {
              ingredientMap[row.ingrediente_id] = 0;
            }
            ingredientMap[row.ingrediente_id] += row.cantidad * qty;
          }
        }
      }
    }

    // Regresar stock
    for (const [ingId, cantidad] of Object.entries(ingredientMap)) {
      await run(
        'UPDATE ingredientes SET stock_actual = stock_actual + ? WHERE id = ?',
        [cantidad, ingId]
      );
    }

    // Marcar como cancelada (soft flag)
    await run('UPDATE ventas SET cancelada = 1 WHERE id = ?', [id]);

    // Registrar cancelación en log
    await logAction(usuarioId, 'CANCELAR_VENTA', `Venta cancelada: #${id}, Total: $${sale.total}`);

    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK');
    console.error('Error al cancelar venta:', error.message);
    throw error;
  }
}

/**
 * Obtiene las ventas de un día específico
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @param {number|null} usuarioId - Filtrar por vendedor
 * @returns {Array} Lista de ventas del día
 */
export async function getSalesByDate(date, usuarioId = null) {
  try {
    const branchId = getBranchId();
    let sql = `SELECT v.*, u.nombre as usuario_nombre 
               FROM ventas v
               LEFT JOIN usuarios u ON v.usuario_id = u.id
               WHERE strftime('%Y-%m-%d', v.fecha) = ? AND v.branch_id = ? AND v.cancelada = 0`;
    const params = [date, branchId];

    if (usuarioId) {
      sql += ` AND v.usuario_id = ?`;
      params.push(usuarioId);
    }

    sql += ` ORDER BY v.fecha DESC`;

    const sales = await query(sql, params);
    return await attachSaleDetails(sales);
  } catch (error) {
    console.error('Error al obtener ventas por fecha:', error);
    throw error;
  }
}

/**
 * Obtiene el resumen de ventas de un día
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @returns {Object} Resumen de ventas
 */
export async function getDailySummary(date) {
  try {
    const branchId = getBranchId();
    const summary = await queryOne(
      `SELECT 
        COUNT(*) as total_ventas,
        SUM(subtotal) as subtotal,
        SUM(impuestos) as impuestos,
        SUM(total) as total
       FROM ventas
       WHERE DATE(fecha) = ? AND branch_id = ? AND cancelada = 0`,
      [date, branchId]
    );

    return summary;
  } catch (error) {
    console.error('Error al obtener resumen diario:', error);
    throw error;
  }
}

/**
 * Obtiene las ventas de un rango de fechas
 * @param {string} startDate - Fecha inicio YYYY-MM-DD
 * @param {string} endDate - Fecha fin YYYY-MM-DD
 * @param {number|null} usuarioId - Filtrar por vendedor
 * @returns {Array} Lista de ventas en el rango
 */
export async function getSalesByDateRange(startDate, endDate, usuarioId = null) {
  try {
    const branchId = getBranchId();
    let sql = `SELECT v.*, u.nombre as usuario_nombre 
               FROM ventas v
               LEFT JOIN usuarios u ON v.usuario_id = u.id
               WHERE strftime('%Y-%m-%d', v.fecha) BETWEEN ? AND ? AND v.branch_id = ? AND v.cancelada = 0`;
    const params = [startDate, endDate, branchId];

    if (usuarioId) {
      sql += ` AND v.usuario_id = ?`;
      params.push(usuarioId);
    }

    sql += ` ORDER BY v.fecha DESC`;

    const sales = await query(sql, params);
    return await attachSaleDetails(sales);
  } catch (error) {
    console.error('Error al obtener ventas por rango de fechas:', error);
    throw error;
  }
}

/**
 * Adjunta detalles de productos a una lista de ventas
 */
async function attachSaleDetails(sales) {
  if (!sales || sales.length === 0) return sales || [];

  const ids = sales.map((s) => s.id);
  const placeholders = ids.map(() => '?').join(',');

  const details = await query(
    `SELECT d.*, p.nombre as producto_nombre 
     FROM detalle_ventas d
     JOIN productos p ON d.producto_id = p.id
     WHERE d.venta_id IN (${placeholders})`,
    ids
  );

  const bySale = {};
  for (const detail of details) {
    if (!bySale[detail.venta_id]) bySale[detail.venta_id] = [];
    bySale[detail.venta_id].push({
      ...detail,
      personalizaciones: detail.personalizaciones
        ? JSON.parse(detail.personalizaciones)
        : null
    });
  }

  return sales.map((sale) => ({
    ...sale,
    detalles: bySale[sale.id] || []
  }));
}

/**
 * Obtiene KPIs de ventas con filtros por período o año específico
 * @param {string} period - 'day', 'week', 'month', 'year'
 * @param {string} startDate - Fecha inicio (opcional)
 * @param {string} endDate - Fecha fin (opcional)
 * @param {string|number} selectedYear - Año específico (opcional)
 * @returns {Object} KPIs de ventas
 */
export async function getSalesKPIs(period = 'day', startDate = null, endDate = null, selectedYear = null) {
  try {
    const branchId = getBranchId();
    console.log('🔍 KPIs - Branch ID:', branchId);
    console.log('🔍 KPIs - Period:', period);
    console.log('🔍 KPIs - StartDate:', startDate);
    console.log('🔍 KPIs - EndDate:', endDate);
    console.log('🔍 KPIs - SelectedYear:', selectedYear);
    
    let dateFilter = '';
    let params = [];

    if (selectedYear) {
      dateFilter = "strftime('%Y', fecha) = ?";
      params.push(String(selectedYear));
    } else if (startDate && endDate) {
      dateFilter = "strftime('%Y-%m-%d', fecha) BETWEEN ? AND ?";
      params.push(startDate, endDate);
    } else {
      const now = new Date();
      const nowTijuana = formatInTimeZone(now, 'America/Tijuana', 'yyyy-MM-dd');
      console.log('🔍 KPIs - Now Tijuana:', nowTijuana);
      
      switch (period) {
        case 'day':
          dateFilter = "strftime('%Y-%m-%d', fecha) = ?";
          params.push(nowTijuana);
          break;
        case 'week':
          const weekAgo = formatInTimeZone(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), 'America/Tijuana', 'yyyy-MM-dd');
          dateFilter = "strftime('%Y-%m-%d', fecha) >= ?";
          params.push(weekAgo);
          break;
        case 'month':
          dateFilter = "strftime('%Y-%m', fecha) = ?";
          params.push(formatInTimeZone(now, 'America/Tijuana', 'yyyy-MM'));
          break;
        case 'year':
          dateFilter = "strftime('%Y', fecha) = ?";
          params.push(formatInTimeZone(now, 'America/Tijuana', 'yyyy'));
          break;
        default:
          dateFilter = "strftime('%Y-%m-%d', fecha) = ?";
          params.push(nowTijuana);
      }
    }
    // Ensure correct parameter order: [dateFilter params..., branchId]
    params.push(branchId);

    // Obtener años con ventas disponibles para el selector dinámico
    const availableYearsRows = await query(
      `SELECT DISTINCT strftime('%Y', fecha) as anio FROM ventas WHERE branch_id = ? AND cancelada = 0 AND fecha IS NOT NULL ORDER BY anio DESC`,
      [branchId]
    );
    const currentYearStr = String(new Date().getFullYear());
    const yearSet = new Set((availableYearsRows || []).map(r => r.anio).filter(Boolean));
    yearSet.add(currentYearStr);
    const aniosDisponibles = Array.from(yearSet).sort((a, b) => b.localeCompare(a));

    // KPIs generales
    const generalKPIs = await queryOne(
      `SELECT 
        COUNT(*) as total_ventas,
        SUM(subtotal) as subtotal,
        SUM(impuestos) as impuestos,
        SUM(total) as total,
        AVG(total) as ticket_promedio
       FROM ventas
       WHERE ${dateFilter} AND branch_id = ? AND cancelada = 0`,
      params
    );

    // Ventas por método de pago
    const paymentMethods = await query(
      `SELECT 
        metodo_pago,
        tipo_tarjeta,
        COUNT(*) as cantidad,
        SUM(total) as total
       FROM ventas
       WHERE ${dateFilter} AND branch_id = ? AND cancelada = 0
       GROUP BY metodo_pago, tipo_tarjeta`,
      params
    );
    console.log(' KPIs - Payment methods:', paymentMethods);

    // Ventas por hora (para gráfico de picos)
    const hourlySales = await query(
      `SELECT 
        strftime('%H', fecha) as hora,
        COUNT(*) as cantidad_ventas,
        SUM(total) as total_ventas
       FROM ventas
       WHERE ${dateFilter} AND branch_id = ? AND cancelada = 0
       GROUP BY strftime('%H', fecha)
       ORDER BY hora`,
      params
    );

    // Productos más vendidos
    const topProducts = await query(
      `SELECT 
        p.nombre as producto_nombre,
        SUM(d.cantidad) as cantidad_vendida,
        SUM(d.importe) as total_ingresos
       FROM detalle_ventas d
       JOIN ventas v ON d.venta_id = v.id
       JOIN productos p ON d.producto_id = p.id
       WHERE ${dateFilter} AND v.branch_id = ? AND v.cancelada = 0
       GROUP BY d.producto_id
       ORDER BY cantidad_vendida DESC
       LIMIT 10`,
      params
    );

    // Ventas por día (para gráfico de tendencia)
    const dailySales = await query(
      `SELECT 
        strftime('%Y-%m-%d', fecha) as fecha,
        COUNT(*) as cantidad_ventas,
        SUM(total) as total_ventas
       FROM ventas
       WHERE ${dateFilter} AND branch_id = ? AND cancelada = 0
       GROUP BY strftime('%Y-%m-%d', fecha)
       ORDER BY fecha`,
      params
    );

    // Ventas por mes (Enero a Diciembre)
    const monthlySalesQuery = await query(
      `SELECT 
        strftime('%m', fecha) as mes_num,
        COUNT(*) as cantidad_ventas,
        SUM(total) as total_ventas
       FROM ventas
       WHERE ${dateFilter} AND branch_id = ? AND cancelada = 0
       GROUP BY strftime('%m', fecha)
       ORDER BY mes_num`,
      params
    );

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthlyMap = {};
    (monthlySalesQuery || []).forEach(m => {
      const idx = parseInt(m.mes_num, 10) - 1;
      if (idx >= 0 && idx < 12) {
        monthlyMap[idx] = {
          ventas: Number(m.cantidad_ventas || 0),
          total: Number(m.total_ventas || 0)
        };
      }
    });

    const fullYearMonths = monthNames.map((nombre, idx) => ({
      mes: nombre,
      mes_num: String(idx + 1).padStart(2, '0'),
      ventas: monthlyMap[idx] ? monthlyMap[idx].ventas : 0,
      total: monthlyMap[idx] ? monthlyMap[idx].total : 0
    }));

    const result = {
      general: {
        total_ventas: generalKPIs?.total_ventas || 0,
        subtotal: generalKPIs?.subtotal || 0,
        impuestos: generalKPIs?.impuestos || 0,
        total: generalKPIs?.total || 0,
        ticket_promedio: generalKPIs?.ticket_promedio || 0
      },
      por_metodo_pago: paymentMethods || [],
      por_hora: hourlySales || [],
      productos_top: topProducts || [],
      por_dia: dailySales || [],
      por_mes: fullYearMonths,
      anios_disponibles: aniosDisponibles
    };
    
    return result;
  } catch (error) {
    console.error('Error al obtener KPIs de ventas:', error);
    throw error;
  }
}
