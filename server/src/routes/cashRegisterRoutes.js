import express from 'express';
import * as cashRegisterController from '../controllers/cashRegisterController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener nombres predefinidos de cajas
router.get('/nombres', cashRegisterController.getCashRegisterNames);
router.post('/nombres', cashRegisterController.createCashRegisterName);

// Obtener caja abierta del usuario actual
router.get('/abierta', cashRegisterController.getOpenCashRegister);

// Abrir una nueva caja
router.post('/abrir', cashRegisterController.openCashRegister);

// Obtener resumen de una caja antes de cerrarla
router.get('/:id/resumen', cashRegisterController.getCashRegisterSummary);

// Cerrar una caja
router.post('/:id/cerrar', cashRegisterController.closeCashRegister);

// Obtener una caja por ID
router.get('/:id', cashRegisterController.getCashRegister);

// Obtener todas las cajas (para administradores)
router.get('/', cashRegisterController.getAllCashRegisters);

export default router;
