import { db, run, query, queryOne } from './database.js';

/**
 * Registro de migraciones ordenadas por versión.
 * Cada migración incluye id único, descripción y la función de ejecución.
 */
const migrations = [
  {
    id: 1,
    name: 'agregar_cancelada_a_ventas',
    up: async () => {
      await run(`ALTER TABLE ventas ADD COLUMN cancelada INTEGER DEFAULT 0`);
    }
  },
  {
    id: 2,
    name: 'agregar_branch_id_a_ventas_y_cajas',
    up: async () => {
      try {
        await run(`ALTER TABLE ventas ADD COLUMN branch_id INTEGER DEFAULT 1`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE cajas ADD COLUMN branch_id INTEGER DEFAULT 1`);
      } catch (e) {}
    }
  },
  {
    id: 3,
    name: 'agregar_personalizaciones_a_detalle_ventas',
    up: async () => {
      try {
        await run(`ALTER TABLE detalle_ventas ADD COLUMN personalizaciones TEXT`);
      } catch (e) {}
    }
  },
  {
    id: 4,
    name: 'agregar_caja_id_a_ventas',
    up: async () => {
      try {
        await run(`ALTER TABLE ventas ADD COLUMN caja_id INTEGER`);
      } catch (e) {}
    }
  },
  {
    id: 5,
    name: 'agregar_categoria_reemplazo_a_ingredientes',
    up: async () => {
      try {
        await run(`ALTER TABLE ingredientes ADD COLUMN categoria_reemplazo TEXT`);
      } catch (e) {}
    }
  },
  {
    id: 6,
    name: 'agregar_tipo_tarjeta_a_ventas',
    up: async () => {
      try {
        await run(`ALTER TABLE ventas ADD COLUMN tipo_tarjeta TEXT`);
      } catch (e) {}
    }
  }
];

/**
 * Inicializa la tabla de control de migraciones y ejecuta las pendientes.
 */
export async function runMigrations() {
  try {
    // 1. Crear tabla de migraciones si no existe
    await run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Obtener migraciones ya ejecutadas
    const executedRows = await query(`SELECT id FROM schema_migrations`);
    const executedIds = new Set(executedRows.map(r => r.id));

    // 3. Ejecutar migraciones pendientes en orden
    for (const migration of migrations) {
      if (!executedIds.has(migration.id)) {
        console.log(`⏳ Ejecutando migración #${migration.id}: ${migration.name}...`);
        try {
          await migration.up();
          await run(`INSERT INTO schema_migrations (id, name) VALUES (?, ?)`, [
            migration.id,
            migration.name
          ]);
          console.log(`✅ Migración #${migration.id} completada exitosamente.`);
        } catch (err) {
          if (err.message && err.message.includes('duplicate column name')) {
            await run(`INSERT OR IGNORE INTO schema_migrations (id, name) VALUES (?, ?)`, [
              migration.id,
              migration.name
            ]);
            console.log(`ℹ️ Migración #${migration.id} registrada (columna ya existente).`);
          } else {
            console.error(`❌ Error en migración #${migration.id}:`, err.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error general en sistema de migraciones:', error.message);
  }
}
