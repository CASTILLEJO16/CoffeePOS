import express from 'express';
import * as productController from '../controllers/productController.js';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware.js';
import { upload } from '../config/upload.js';

const router = express.Router();

// Rutas públicas (para el POS)
router.get('/', productController.getProducts);
router.get('/categorias', productController.getCategories);
router.get('/:id', productController.getProduct);

// Rutas protegidas (requieren autenticación)
router.use(authenticateToken);

// Rutas de administración (requieren rol admin)
router.get('/admin/todos', requireAdmin, productController.getAllProducts);
router.post('/', requireAdmin, upload.single('imagen'), productController.createProduct);
router.put('/:id', requireAdmin, upload.single('imagen'), productController.updateProduct);
router.patch('/:id/activar', requireAdmin, productController.activateProduct);
router.patch('/:id/desactivar', requireAdmin, productController.deactivateProduct);
router.delete('/:id', requireAdmin, productController.deleteProduct);

export default router;
