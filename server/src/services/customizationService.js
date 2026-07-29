import { query, queryOne, run } from '../config/database.js';
import { logAction } from './logService.js';

/**
 * Servicio de Personalizaciones
 * Contiene toda la lógica de negocio relacionada con opciones de personalización
 */

/**
 * Obtiene todas las personalizaciones por tipo
 * @param {string} tipo - Tipo de personalización (milk, topping, cold_foam, syrup, tea_option, sweetness)
 * @returns {Array} Lista de personalizaciones
 */
export async function getCustomizationsByType(tipo) {
  try {
    const customizations = await query(
      `SELECT * FROM personalizaciones 
       WHERE tipo = ? AND activo = 1 
       ORDER BY id ASC`,
      [tipo]
    );
    return customizations;
  } catch (error) {
    console.error('Error al obtener personalizaciones:', error);
    throw error;
  }
}

/**
 * Obtiene todas las personalizaciones
 * @returns {Array} Lista de todas las personalizaciones
 */
export async function getAllCustomizations() {
  try {
    const customizations = await query(
      `SELECT * FROM personalizaciones 
       ORDER BY tipo, id ASC`
    );
    return customizations;
  } catch (error) {
    console.error('Error al obtener todas las personalizaciones:', error);
    throw error;
  }
}

/**
 * Obtiene una personalización por ID
 * @param {number} id - ID de la personalización
 * @returns {Object} Personalización
 */
export async function getCustomizationById(id) {
  try {
    const customization = await queryOne(
      'SELECT * FROM personalizaciones WHERE id = ?',
      [id]
    );
    return customization;
  } catch (error) {
    console.error('Error al obtener personalización:', error);
    throw error;
  }
}

/**
 * Crea una nueva personalización
 * @param {Object} customizationData - Datos de la personalización
 * @param {number} usuarioId - ID del usuario
 * @returns {Object} Personalización creada
 */
export async function createCustomization(customizationData, usuarioId = null) {
  try {
    const { tipo, nombre, precio_adicional = 0 } = customizationData;

    if (!tipo || !nombre) {
      throw new Error('Tipo y nombre son requeridos');
    }

    const result = await run(
      'INSERT INTO personalizaciones (tipo, nombre, precio_adicional) VALUES (?, ?, ?)',
      [tipo, nombre, precio_adicional]
    );

    await logAction(usuarioId, 'CREAR_PERSONALIZACION', `Personalización creada: #${result.id}, Tipo: ${tipo}, Nombre: ${nombre}`);

    return await getCustomizationById(result.id);
  } catch (error) {
    console.error('Error al crear personalización:', error);
    throw error;
  }
}

/**
 * Actualiza una personalización
 * @param {number} id - ID de la personalización
 * @param {Object} customizationData - Datos a actualizar
 * @param {number} usuarioId - ID del usuario
 * @returns {Object} Personalización actualizada
 */
export async function updateCustomization(id, customizationData, usuarioId = null) {
  try {
    const { tipo, nombre, precio_adicional, activo } = customizationData;

    const existing = await getCustomizationById(id);
    if (!existing) {
      throw new Error('Personalización no encontrada');
    }

    const updates = [];
    const params = [];

    if (tipo !== undefined) {
      updates.push('tipo = ?');
      params.push(tipo);
    }
    if (nombre !== undefined) {
      updates.push('nombre = ?');
      params.push(nombre);
    }
    if (precio_adicional !== undefined) {
      updates.push('precio_adicional = ?');
      params.push(precio_adicional);
    }
    if (activo !== undefined) {
      updates.push('activo = ?');
      params.push(activo);
    }

    if (updates.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    params.push(id);
    const sql = `UPDATE personalizaciones SET ${updates.join(', ')} WHERE id = ?`;

    await run(sql, params);

    await logAction(usuarioId, 'ACTUALIZAR_PERSONALIZACION', `Personalización actualizada: #${id}`);

    return await getCustomizationById(id);
  } catch (error) {
    console.error('Error al actualizar personalización:', error);
    throw error;
  }
}

/**
 * Elimina (desactiva) una personalización
 * @param {number} id - ID de la personalización
 * @param {number} usuarioId - ID del usuario
 */
export async function deleteCustomization(id, usuarioId = null) {
  try {
    const existing = await getCustomizationById(id);
    if (!existing) {
      throw new Error('Personalización no encontrada');
    }

    await run(
      'UPDATE personalizaciones SET activo = 0 WHERE id = ?',
      [id]
    );

    await logAction(usuarioId, 'ELIMINAR_PERSONALIZACION', `Personalización eliminada: #${id}, Nombre: ${existing.nombre}`);
  } catch (error) {
    console.error('Error al eliminar personalización:', error);
    throw error;
  }
}

/**
 * Inicializa las personalizaciones por defecto
 */
export async function initializeDefaultCustomizations() {
  try {
    const tipos = ['milk', 'topping', 'cold_foam', 'syrup', 'tea_option', 'sweetness'];
    
    // Verificar si ya hay personalizaciones
    const existing = await query('SELECT COUNT(*) as count FROM personalizaciones');
    if (existing[0].count > 0) {
      console.log('Las personalizaciones ya están inicializadas');
      return;
    }

    const defaultCustomizations = [
      // Tipos de leche
      { tipo: 'milk', nombre: 'Entera', precio_adicional: 0 },
      { tipo: 'milk', nombre: 'Deslactosada', precio_adicional: 0 },
      { tipo: 'milk', nombre: 'Almendra', precio_adicional: 5 },
      { tipo: 'milk', nombre: 'Avena', precio_adicional: 5 },
      { tipo: 'milk', nombre: 'Coco', precio_adicional: 5 },
      { tipo: 'milk', nombre: 'Soya', precio_adicional: 5 },
      
      // Toppings
      { tipo: 'topping', nombre: 'Chocolate', precio_adicional: 5 },
      { tipo: 'topping', nombre: 'Caramelo', precio_adicional: 5 },
      { tipo: 'topping', nombre: 'Crema Batida', precio_adicional: 5 },
      { tipo: 'topping', nombre: 'Chips de Chocolate', precio_adicional: 5 },
      { tipo: 'topping', nombre: 'Nuez Picada', precio_adicional: 5 },
      { tipo: 'topping', nombre: 'Canela', precio_adicional: 3 },
      
      // Cold Foam
      { tipo: 'cold_foam', nombre: 'Sin', precio_adicional: 0 },
      { tipo: 'cold_foam', nombre: 'Vainilla', precio_adicional: 10 },
      { tipo: 'cold_foam', nombre: 'Caramelo', precio_adicional: 10 },
      { tipo: 'cold_foam', nombre: 'Mocha', precio_adicional: 10 },
      { tipo: 'cold_foam', nombre: 'Calabaza', precio_adicional: 10 },
      
      // Jarabes
      { tipo: 'syrup', nombre: 'Sin', precio_adicional: 0 },
      { tipo: 'syrup', nombre: 'Vainilla', precio_adicional: 5 },
      { tipo: 'syrup', nombre: 'Caramelo', precio_adicional: 5 },
      { tipo: 'syrup', nombre: 'Avellana', precio_adicional: 5 },
      { tipo: 'syrup', nombre: 'Chocolate', precio_adicional: 5 },
      { tipo: 'syrup', nombre: 'Frambuesa', precio_adicional: 5 },
      { tipo: 'syrup', nombre: 'Menta', precio_adicional: 5 },
      { tipo: 'syrup', nombre: 'Canela', precio_adicional: 5 },
      
      // Opciones de té
      { tipo: 'tea_option', nombre: 'Caliente', precio_adicional: 0 },
      { tipo: 'tea_option', nombre: 'Helado', precio_adicional: 0 },
      
      // Nivel de dulzura
      { tipo: 'sweetness', nombre: 'Sin azúcar', precio_adicional: 0 },
      { tipo: 'sweetness', nombre: '25%', precio_adicional: 0 },
      { tipo: 'sweetness', nombre: '50%', precio_adicional: 0 },
      { tipo: 'sweetness', nombre: '75%', precio_adicional: 0 },
      { tipo: 'sweetness', nombre: '100%', precio_adicional: 0 },
    ];

    for (const custom of defaultCustomizations) {
      await run(
        'INSERT INTO personalizaciones (tipo, nombre, precio_adicional) VALUES (?, ?, ?)',
        [custom.tipo, custom.nombre, custom.precio_adicional]
      );
    }

    console.log('Personalizaciones por defecto inicializadas');
  } catch (error) {
    console.error('Error al inicializar personalizaciones por defecto:', error);
    throw error;
  }
}
