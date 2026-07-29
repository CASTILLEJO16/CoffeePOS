import { query, run } from '../config/database.js';

export async function getIngredientes(req, res) {
  try {
    const ingredientes = await query('SELECT * FROM ingredientes WHERE activo = 1 ORDER BY nombre');
    res.json({ success: true, data: ingredientes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createIngrediente(req, res) {
  try {
    const { nombre, unidad_medida, stock_minimo, categoria_reemplazo } = req.body;
    if (!nombre || !unidad_medida) throw new Error('Nombre y unidad de medida requeridos');
    
    const result = await run(
      'INSERT INTO ingredientes (nombre, unidad_medida, stock_minimo, categoria_reemplazo) VALUES (?, ?, ?, ?)',
      [nombre, unidad_medida, stock_minimo || 0, categoria_reemplazo || null]
    );
    res.status(201).json({ success: true, data: { id: result.id, nombre, unidad_medida, stock_minimo, categoria_reemplazo } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateIngrediente(req, res) {
  try {
    const { id } = req.params;
    const { nombre, unidad_medida, stock_minimo, categoria_reemplazo } = req.body;
    
    await run(
      'UPDATE ingredientes SET nombre = ?, unidad_medida = ?, stock_minimo = ?, categoria_reemplazo = ? WHERE id = ?',
      [nombre, unidad_medida, stock_minimo, categoria_reemplazo || null, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteIngrediente(req, res) {
  try {
    const { id } = req.params;
    await run('UPDATE ingredientes SET activo = 0 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function ajustarStock(req, res) {
  try {
    const { id } = req.params;
    const { cantidad, tipo, observaciones } = req.body; // tipo: 'agregar' o 'establecer'
    
    let sql = '';
    if (tipo === 'agregar') {
      sql = 'UPDATE ingredientes SET stock_actual = stock_actual + ? WHERE id = ?';
    } else {
      sql = 'UPDATE ingredientes SET stock_actual = ? WHERE id = ?';
    }
    
    await run(sql, [cantidad, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getRecetaProducto(req, res) {
  try {
    const { id } = req.params;
    const receta = await query(`
      SELECT r.id, r.ingrediente_id, r.cantidad, i.nombre, i.unidad_medida 
      FROM recetas r 
      JOIN ingredientes i ON r.ingrediente_id = i.id 
      WHERE r.producto_id = ? AND i.activo = 1
    `, [id]);
    res.json({ success: true, data: receta });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function saveRecetaProducto(req, res) {
  try {
    const { id } = req.params;
    const { ingredientes } = req.body; // Array de { ingrediente_id, cantidad }
    
    // Primero borramos receta anterior
    await run('DELETE FROM recetas WHERE producto_id = ?', [id]);
    
    // Insertamos la nueva
    for (const ing of ingredientes) {
      await run('INSERT INTO recetas (producto_id, ingrediente_id, cantidad) VALUES (?, ?, ?)', 
        [id, ing.ingrediente_id, ing.cantidad]);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getRecetaPersonalizacion(req, res) {
  try {
    const { id } = req.params;
    const receta = await query(`
      SELECT rp.id, rp.ingrediente_id, rp.cantidad, i.nombre, i.unidad_medida 
      FROM recetas_personalizacion rp 
      JOIN ingredientes i ON rp.ingrediente_id = i.id 
      WHERE rp.personalizacion_id = ? AND i.activo = 1
    `, [id]);
    res.json({ success: true, data: receta });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function saveRecetaPersonalizacion(req, res) {
  try {
    const { id } = req.params;
    const { ingredientes } = req.body;
    
    await run('DELETE FROM recetas_personalizacion WHERE personalizacion_id = ?', [id]);
    
    for (const ing of ingredientes) {
      await run('INSERT INTO recetas_personalizacion (personalizacion_id, ingrediente_id, cantidad) VALUES (?, ?, ?)', 
        [id, ing.ingrediente_id, ing.cantidad]);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
