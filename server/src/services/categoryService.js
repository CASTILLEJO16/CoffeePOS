import { query, queryOne, run } from '../config/database.js';

/**
 * Servicio de Categorías
 * Maneja las operaciones CRUD para categorías de productos
 */

/**
 * Obtiene todas las categorías activas
 */
export async function getAllCategories() {
  try {
    const categories = await query(
      'SELECT * FROM categorias WHERE activo = 1 ORDER BY nombre ASC'
    );
    return categories;
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    throw error;
  }
}

/**
 * Obtiene una categoría por su ID
 */
export async function getCategoryById(id) {
  try {
    const category = await queryOne(
      'SELECT * FROM categorias WHERE id = ?',
      [id]
    );
    return category;
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    throw error;
  }
}

/**
 * Crea una nueva categoría
 */
export async function createCategory(nombre) {
  try {
    const result = await run(
      'INSERT INTO categorias (nombre) VALUES (?)',
      [nombre]
    );
    return await getCategoryById(result.id);
  } catch (error) {
    console.error('Error al crear categoría:', error);
    throw error;
  }
}

/**
 * Actualiza una categoría
 */
export async function updateCategory(id, nombre) {
  try {
    await run(
      'UPDATE categorias SET nombre = ? WHERE id = ?',
      [nombre, id]
    );
    return await getCategoryById(id);
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    throw error;
  }
}

/**
 * Elimina (desactiva) una categoría
 */
export async function deleteCategory(id) {
  try {
    await run(
      'UPDATE categorias SET activo = 0 WHERE id = ?',
      [id]
    );
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    throw error;
  }
}
