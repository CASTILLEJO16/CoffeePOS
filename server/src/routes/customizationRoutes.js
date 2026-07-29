import express from 'express';
import * as customizationController from '../controllers/customizationController.js';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rutas públicas (para el POS)
router.get('/', customizationController.getCustomizations);
router.get('/:id', customizationController.getCustomization);

// Rutas protegidas (requieren autenticación)
router.use(authenticateToken);

// Rutas de administración (requieren rol admin)
router.post('/', requireAdmin, customizationController.createCustomization);
router.put('/:id', requireAdmin, customizationController.updateCustomization);
router.delete('/:id', requireAdmin, customizationController.deleteCustomization);

export default router;
