import express from 'express';
import * as configController from '../controllers/configController.js';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Obtener todas las configuraciones
router.get('/', configController.getAllConfig);

// Actualizar una configuración (solo admin)
router.post('/', requireAdmin, configController.updateConfig);

export default router;
