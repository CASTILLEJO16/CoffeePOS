import express from 'express';
import * as saleController from '../controllers/saleController.js';
import { authenticateToken, requireSellerOrAdmin, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para cajeros y administradores
router.get('/', requireSellerOrAdmin, saleController.getSales);
router.post('/', requireSellerOrAdmin, saleController.createSale);

// Rutas exclusivas para administradores (deben ir antes de /:id)
router.get('/resumen', requireAdmin, saleController.getDailySummary);
router.get('/kpis', requireAdmin, saleController.getSalesKPIs);

// Rutas con parámetros (deben ir al final)
router.get('/:id', requireSellerOrAdmin, saleController.getSale);
router.post('/:id/imprimir', requireSellerOrAdmin, saleController.printTicket);
router.post('/:id/devolver', requireSellerOrAdmin, saleController.refundSale);
router.post('/:id/cancelar', requireAdmin, saleController.cancelSale);

export default router;
