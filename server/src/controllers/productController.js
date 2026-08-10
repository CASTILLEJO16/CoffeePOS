import * as productService from '../services/productService.js';
import { logAction } from '../services/logService.js';

/**
 * Controlador de Productos
 * Maneja las requests HTTP relacionadas con productos
 */

/**
 * Obtiene todos los productos activos
 */
export async function getProducts(req, res) {
  try {
    const { search, categoria } = req.query;

    let products;
    
    if (search) {
      products = await productService.searchProducts(search);
    } else if (categoria) {
      products = await productService.getProductsByCategory(categoria);
    } else {
      products = await productService.getActiveProducts();
    }

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Error en getProducts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Obtiene todos los productos (incluyendo inactivos) - Solo admin
 */
export async function getAllProducts(req, res) {
  try {
    const products = await productService.getAllProducts();

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Error en getAllProducts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Obtiene un producto por ID
 */
export async function getProduct(req, res) {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error en getProduct:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Crea un nuevo producto
 */
export async function createProduct(req, res) {
  try {
    const productData = req.body;
    const userId = req.user?.userId;

    // Si se subió una imagen, usar la ruta del archivo
    if (req.file) {
      productData.imagen = `/uploads/${req.file.filename}`;
    }

    const product = await productService.createProduct(productData, userId);

    // Registrar creación de producto
    await logAction(userId, 'CREAR_PRODUCTO', `Producto creado: ${productData.nombre}`);

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error en createProduct:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Actualiza un producto existente
 */
export async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const productData = req.body;
    const userId = req.user?.userId;

    // Si se subió una nueva imagen, usar la ruta del archivo
    if (req.file) {
      productData.imagen = `/uploads/${req.file.filename}`;
    } else {
      // Si no se subió imagen nueva, eliminar el campo imagen de productData
      // para que el backend mantenga la imagen existente
      delete productData.imagen;
    }

    const product = await productService.updateProduct(id, productData, userId);

    // Registrar actualización de producto
    await logAction(userId, 'ACTUALIZAR_PRODUCTO', `Producto actualizado: ID ${id}`);

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error en updateProduct:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Desactiva un producto
 */
export async function deactivateProduct(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    await productService.deactivateProduct(id, userId);

    res.json({
      success: true,
      message: 'Producto desactivado correctamente'
    });
  } catch (error) {
    console.error('Error en deactivateProduct:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Activa un producto
 */
export async function activateProduct(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    await productService.activateProduct(id, userId);

    res.json({
      success: true,
      message: 'Producto activado correctamente'
    });
  } catch (error) {
    console.error('Error en activateProduct:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Elimina un producto permanentemente
 */
export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    await productService.deleteProduct(id, userId);

    res.json({
      success: true,
      message: 'Producto eliminado correctamente'
    });
  } catch (error) {
    console.error('Error en deleteProduct:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Obtiene todas las categorías
 */
export async function getCategories(req, res) {
  try {
    const categories = await productService.getCategories();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error en getCategories:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
