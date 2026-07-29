import { getUserById } from '../services/authService.js';
import { getSalesByUser } from '../services/saleService.js';
import { getCashRegistersByUser } from '../services/cashRegisterService.js';
import { getLogsByUser } from '../services/logService.js';

/**
 * Controlador de Actividad de Usuario
 * Maneja las requests para obtener el historial completo de un usuario
 */

export async function getUserActivity(req, res) {
  try {
    const { userId } = req.params;

    // Obtener información básica del usuario
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Obtener todas las actividades en paralelo
    const [cashRegisters, sales, logs] = await Promise.all([
      getCashRegistersByUser(userId),
      getSalesByUser(userId),
      getLogsByUser(userId)
    ]);

    // Calcular estadísticas
    const totalCajas = cashRegisters.length;
    const totalVentas = sales.length;
    const totalVentasMonto = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalLogs = logs.length;

    res.json({
      success: true,
      data: {
        user,
        statistics: {
          totalCajas,
          totalVentas,
          totalVentasMonto,
          totalLogs
        },
        cashRegisters,
        sales,
        logs
      }
    });
  } catch (error) {
    console.error('Error en getUserActivity:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function getUserCashRegisters(req, res) {
  try {
    const { userId } = req.params;
    const cashRegisters = await getCashRegistersByUser(userId);

    res.json({
      success: true,
      data: cashRegisters
    });
  } catch (error) {
    console.error('Error en getUserCashRegisters:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function getUserSales(req, res) {
  try {
    const { userId } = req.params;
    const sales = await getSalesByUser(userId);

    res.json({
      success: true,
      data: sales
    });
  } catch (error) {
    console.error('Error en getUserSales:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function getUserLogs(req, res) {
  try {
    const { userId } = req.params;
    const logs = await getLogsByUser(userId);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error en getUserLogs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
