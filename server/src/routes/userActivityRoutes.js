import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import * as userActivityController from '../controllers/userActivityController.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener toda la actividad de un usuario (cajas, ventas, logs)
router.get('/:userId/actividad', userActivityController.getUserActivity);

// Obtener cajas de un usuario
router.get('/:userId/cajas', userActivityController.getUserCashRegisters);

// Obtener ventas de un usuario
router.get('/:userId/ventas', userActivityController.getUserSales);

// Obtener logs de un usuario
router.get('/:userId/logs', userActivityController.getUserLogs);

export default router;
