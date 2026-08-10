import { query, queryOne, run } from '../config/database.js';
import { logAction } from './logService.js';

/**
 * Servicio de Productos
 * Contiene toda la lógica de negocio relacionada con productos
 */

/**
 * Obtiene todos los productos activos
 * @returns {Array} Lista de productos activos
 */
export async function getActiveProducts() {
  try {
    const products = await query(
      'SELECT * FROM productos WHERE activo = 1 ORDER BY categoria, nombre'
    );
    return products;
  } catch (error) {
    console.error('Error al obtener productos:', error);
    throw error;
  }
}

/**
 * Obtiene todos los productos (incluyendo inactivos)
 * @returns {Array} Lista de todos los productos
 */
export async function getAllProducts() {
  try {
    const products = await query(
      'SELECT * FROM productos ORDER BY categoria, nombre'
    );
    return products;
  } catch (error) {
    console.error('Error al obtener productos:', error);
    throw error;
  }
}

/**
 * Obtiene un producto por su ID
 * @param {number} id - ID del producto
 * @returns {Object} Producto encontrado
 */
export async function getProductById(id) {
  try {
    const product = await queryOne('SELECT * FROM productos WHERE id = ?', [id]);
    return product;
  } catch (error) {
    console.error('Error al obtener producto:', error);
    throw error;
  }
}

/**
 * Crea un nuevo producto
 * @param {Object} productData - Datos del producto
 * @param {number} usuarioId - ID del usuario que crea el producto
 * @returns {Object} Producto creado
 */
export async function createProduct(productData, usuarioId = null) {
  try {
    const { nombre, precio, categoria, imagen } = productData;
    
    const result = await run(
      'INSERT INTO productos (nombre, precio, categoria, imagen) VALUES (?, ?, ?, ?)',
      [nombre, precio, categoria, imagen]
    );

    await logAction(usuarioId, 'CREAR_PRODUCTO', `Producto creado: ${nombre}`);
    
    return await getProductById(result.id);
  } catch (error) {
    console.error('Error al crear producto:', error);
    throw error;
  }
}

/**
 * Actualiza un producto existente
 * @param {number} id - ID del producto
 * @param {Object} productData - Datos a actualizar
 * @param {number} usuarioId - ID del usuario que actualiza
 * @returns {Object} Producto actualizado
 */
export async function updateProduct(id, productData, usuarioId = null) {
  try {
    const { nombre, precio, categoria, imagen, activo } = productData;
    
    // Si se proporciona una imagen (incluyendo null para eliminarla), actualizarla
    // Si no se proporciona, mantener la imagen existente
    if (imagen !== undefined) {
      await run(
        'UPDATE productos SET nombre = ?, precio = ?, categoria = ?, imagen = ?, activo = ? WHERE id = ?',
        [nombre, precio, categoria, imagen, activo, id]
      );
    } else {
      // Mantener la imagen existente
      await run(
        'UPDATE productos SET nombre = ?, precio = ?, categoria = ?, activo = ? WHERE id = ?',
        [nombre, precio, categoria, activo, id]
      );
    }

    await logAction(usuarioId, 'ACTUALIZAR_PRODUCTO', `Producto actualizado: ${nombre}`);
    
    return await getProductById(id);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    throw error;
  }
}

/**
 * Desactiva un producto (soft delete)
 * @param {number} id - ID del producto
 * @param {number} usuarioId - ID del usuario que desactiva
 */
export async function deactivateProduct(id, usuarioId = null) {
  try {
    const product = await getProductById(id);
    await run('UPDATE productos SET activo = 0 WHERE id = ?', [id]);
    
    await logAction(usuarioId, 'DESACTIVAR_PRODUCTO', `Producto desactivado: ${product.nombre}`);
  } catch (error) {
    console.error('Error al desactivar producto:', error);
    throw error;
  }
}

/**
 * Activa un producto
 * @param {number} id - ID del producto
 * @param {number} usuarioId - ID del usuario que activa
 */
export async function activateProduct(id, usuarioId = null) {
  try {
    const product = await getProductById(id);
    await run('UPDATE productos SET activo = 1 WHERE id = ?', [id]);
    
    await logAction(usuarioId, 'ACTIVAR_PRODUCTO', `Producto activado: ${product.nombre}`);
  } catch (error) {
    console.error('Error al activar producto:', error);
    throw error;
  }
}

/**
 * Elimina un producto permanentemente
 * @param {number} id - ID del producto
 * @param {number} usuarioId - ID del usuario que elimina
 */
export async function deleteProduct(id, usuarioId = null) {
  try {
    const product = await getProductById(id);
    await run('DELETE FROM productos WHERE id = ?', [id]);
    
    await logAction(usuarioId, 'ELIMINAR_PRODUCTO', `Producto eliminado: ${product.nombre}`);
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    throw error;
  }
}

/**
 * Busca productos por nombre o categoría
 * @param {string} searchTerm - Término de búsqueda
 * @returns {Array} Lista de productos que coinciden
 */
export async function searchProducts(searchTerm) {
  try {
    const products = await query(
      `SELECT * FROM productos 
       WHERE (nombre LIKE ? OR categoria LIKE ?) AND activo = 1
       ORDER BY categoria, nombre`,
      [`%${searchTerm}%`, `%${searchTerm}%`]
    );
    return products;
  } catch (error) {
    console.error('Error al buscar productos:', error);
    throw error;
  }
}

/**
 * Obtiene productos por categoría
 * @param {string} categoria - Nombre de la categoría
 * @returns {Array} Lista de productos de la categoría
 */
export async function getProductsByCategory(categoria) {
  try {
    const products = await query(
      'SELECT * FROM productos WHERE categoria = ? AND activo = 1 ORDER BY nombre',
      [categoria]
    );
    return products;
  } catch (error) {
    console.error('Error al obtener productos por categoría:', error);
    throw error;
  }
}

/**
 * Obtiene todas las categorías únicas
 * @returns {Array} Lista de categorías
 */
export async function getCategories() {
  try {
    const categories = await query(
      'SELECT DISTINCT categoria FROM productos WHERE activo = 1 ORDER BY categoria'
    );
    return categories.map(c => c.categoria);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    throw error;
  }
}
