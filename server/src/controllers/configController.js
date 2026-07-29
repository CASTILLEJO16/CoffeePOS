import { query, run } from '../config/database.js';

export async function getAllConfig(req, res) {
  try {
    const configRows = await query('SELECT clave, valor FROM configuracion');
    const configMap = {};
    configRows.forEach(row => {
      configMap[row.clave] = row.valor;
    });
    res.json({ success: true, data: configMap });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateConfig(req, res) {
  try {
    // aceptar ambos formatos:
    // 1) { configuraciones: { clave: valor } }
    // 2) { clave: valor }
    const configuraciones = req.body.configuraciones || req.body;

    for (const [clave, valor] of Object.entries(configuraciones)) {
      // Usar INSERT OR REPLACE (o ON CONFLICT UPDATE en sqlite si fuera el caso).
      // Como 'clave' es UNIQUE, podemos hacer:
      await run(
        `INSERT INTO configuracion (clave, valor) VALUES (?, ?)
         ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
        [clave, String(valor)]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
