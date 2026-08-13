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
  },
  {
    id: 7,
    name: 'agregar_campos_dolar_a_ventas',
    up: async () => {
      try {
        await run(`ALTER TABLE ventas ADD COLUMN tipo_cambio REAL`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE ventas ADD COLUMN monto_dolar REAL`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE ventas ADD COLUMN dolar_recibido REAL`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE ventas ADD COLUMN cambio_pesos REAL`);
      } catch (e) {}
    }
  },
  {
    id: 8,
    name: 'agregar_ventas_dolar_a_cajas',
    up: async () => {
      try {
        await run(`ALTER TABLE cajas ADD COLUMN ventas_dolar REAL DEFAULT 0`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE cajas ADD COLUMN total_dolar REAL DEFAULT 0`);
      } catch (e) {}
    }
  },
  {
    id: 9,
    name: 'agregar_pagos_mixtos_a_ventas',
    up: async () => {
      try {
        await run(`ALTER TABLE ventas ADD COLUMN efectivo_mxn REAL DEFAULT 0`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE ventas ADD COLUMN efectivo_usd REAL DEFAULT 0`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE ventas ADD COLUMN tarjeta_credito REAL DEFAULT 0`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE ventas ADD COLUMN tarjeta_debito REAL DEFAULT 0`);
      } catch (e) {}
    }
  },
  {
    id: 10,
    name: 'agregar_descuento_a_productos',
    up: async () => {
      try {
        await run(`ALTER TABLE productos ADD COLUMN descuento REAL DEFAULT 0`);
      } catch (e) {}
    }
  },
  {
    id: 11,
    name: 'agregar_descuento_a_detalle_ventas',
    up: async () => {
      try {
        await run(`ALTER TABLE detalle_ventas ADD COLUMN descuento REAL DEFAULT 0`);
      } catch (e) {}
    }
  },
  {
    id: 12,
    name: 'agregar_motivo_devolucion_a_ventas',
    up: async () => {
      try {
        await run(`ALTER TABLE ventas ADD COLUMN motivo_devolucion TEXT`);
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
