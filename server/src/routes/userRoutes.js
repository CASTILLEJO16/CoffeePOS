import express from 'express';
import * as userController from '../controllers/userController.js';
import * as userActivityController from '../controllers/userActivityController.js';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para administradores
router.get('/', requireAdmin, userController.getUsers);
router.get('/:id', requireAdmin, userController.getUser);
router.post('/', requireAdmin, userController.createUser);
router.put('/:id', requireAdmin, userController.updateUser);
router.patch('/:id/activar', requireAdmin, userController.activateUser);
router.patch('/:id/desactivar', requireAdmin, userController.deactivateUser);

// Rutas de actividad de usuario (deben ir después de las rutas básicas)
router.get('/:userId/actividad', requireAdmin, userActivityController.getUserActivity);
router.get('/:userId/cajas', requireAdmin, userActivityController.getUserCashRegisters);
router.get('/:userId/ventas', requireAdmin, userActivityController.getUserSales);
router.get('/:userId/logs', requireAdmin, userActivityController.getUserLogs);

export default router;
