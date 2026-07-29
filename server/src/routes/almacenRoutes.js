import express from 'express';
import * as almacenController from '../controllers/almacenController.js';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Ingredientes
router.get('/ingredientes', almacenController.getIngredientes);
router.post('/ingredientes', requireAdmin, almacenController.createIngrediente);
router.put('/ingredientes/:id', requireAdmin, almacenController.updateIngrediente);
router.delete('/ingredientes/:id', requireAdmin, almacenController.deleteIngrediente);
router.post('/ingredientes/:id/ajuste', requireAdmin, almacenController.ajustarStock);

// Recetas (productos)
router.get('/recetas/producto/:id', almacenController.getRecetaProducto);
router.post('/recetas/producto/:id', requireAdmin, almacenController.saveRecetaProducto);

// Recetas (personalizaciones)
router.get('/recetas/personalizacion/:id', almacenController.getRecetaPersonalizacion);
router.post('/recetas/personalizacion/:id', requireAdmin, almacenController.saveRecetaPersonalizacion);

export default router;
