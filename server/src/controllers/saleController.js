import * as saleService from '../services/saleService.js';
import * as ticketService from '../services/ticketService.js';
import { logAction } from '../services/logService.js';

/**
 * Controlador de Ventas
 * Maneja las requests HTTP relacionadas con ventas
 */

/**
 * Obtiene todas las ventas
 */
export async function getSales(req, res) {
  try {
    const { limit, offset, date, startDate, endDate } = req.query;
    const userId = req.user?.userId;

    let sales;

    if (date) {
      sales = await saleService.getSalesByDate(date, userId);
    } else if (startDate && endDate) {
      sales = await saleService.getSalesByDateRange(startDate, endDate, userId);
    } else {
      sales = await saleService.getSales(
        parseInt(limit) || 100,
        parseInt(offset) || 0,
        userId
      );
    }

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json({
      success: true,
      data: sales
    });
  } catch (error) {
    console.error('Error en getSales:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Obtiene una venta por ID con sus detalles
 */
export async function getSale(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;
    const sale = await saleService.getSaleById(id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Venta no encontrada'
      });
    }

    // Vendedores solo pueden ver sus propias ventas
    if (role !== 'admin' && sale.usuario_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes acceso a esta venta'
      });
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('Error en getSale:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Crea una nueva venta
 */
export async function createSale(req, res) {
  try {
    const saleData = req.body;
    const userId = req.user?.userId;

    const sale = await saleService.createSale(saleData, userId);

    res.status(201).json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('Error en createSale:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Cancela una venta
 */
export async function cancelSale(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    await saleService.cancelSale(id, userId);

    res.json({
      success: true,
      message: 'Venta cancelada correctamente'
    });
  } catch (error) {
    console.error('Error en cancelSale:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Devuelve una venta (requiere autorización con contraseña)
 */
export async function refundSale(req, res) {
  try {
    const { id } = req.params;
    const { password, motivo } = req.body;
    const userId = req.user?.userId;
    const role = req.user?.role;

    // Verificar que se proporcionó la contraseña
    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere la contraseña para autorizar la devolución'
      });
    }

    // Verificar la contraseña del usuario
    const { verifyUserPassword } = await import('../services/authService.js');
    const passwordValid = await verifyUserPassword(userId, password);

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        error: 'Contraseña incorrecta'
      });
    }

    // Realizar la devolución
    await saleService.refundSale(id, userId, motivo);

    res.json({
      success: true,
      message: 'Venta devuelta correctamente'
    });
  } catch (error) {
    console.error('Error en refundSale:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Genera e imprime un ticket
 */
export async function printTicket(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const sale = await saleService.getSaleById(id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Venta no encontrada'
      });
    }

    const result = await ticketService.printTicket(sale);

    // Registrar reimpresión
    await logAction(userId, 'REIMPRIMIR_TICKET', `Ticket reimpreso: #${id}`);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error en printTicket:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Obtiene el resumen de ventas de un día
 */
export async function getDailySummary(req, res) {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el parámetro date'
      });
    }

    const summary = await saleService.getDailySummary(date);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error en getDailySummary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Obtiene KPIs de ventas con filtros
 */
export async function getSalesKPIs(req, res) {
  try {
    const { period, startDate, endDate, year } = req.query;

    const kpis = await saleService.getSalesKPIs(period, startDate, endDate, year);

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json({
      success: true,
      data: kpis
    });
  } catch (error) {
    console.error('Error en getSalesKPIs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
