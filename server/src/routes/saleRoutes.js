import express from 'express';
import * as saleController from '../controllers/saleController.js';
import { authenticateToken, requireSellerOrAdmin, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para cajeros y administradores
router.get('/', requireSellerOrAdmin, saleController.getSales);
router.get('/:id', requireSellerOrAdmin, saleController.getSale);
router.post('/', requireSellerOrAdmin, saleController.createSale);
router.post('/:id/imprimir', requireSellerOrAdmin, saleController.printTicket);

// Rutas exclusivas para administradores
router.get('/resumen', requireAdmin, saleController.getDailySummary);
router.post('/:id/cancelar', requireAdmin, saleController.cancelSale);

export default router;
