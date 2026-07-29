import express from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Obtener todas las categorías (público)
router.get('/', getCategories);

// Crear categoría (requiere autenticación)
router.post('/', authenticateToken, createCategory);

// Actualizar categoría (requiere autenticación)
router.put('/:id', authenticateToken, updateCategory);

// Eliminar categoría (requiere autenticación)
router.delete('/:id', authenticateToken, deleteCategory);

export default router;
