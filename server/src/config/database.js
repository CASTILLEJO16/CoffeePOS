import sqlite3 from 'sqlite3';
import { config } from './config.js';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { initializeDefaultCustomizations } from '../services/customizationService.js';
import { runMigrations } from './migrations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In Electron/production, store DB in userData to persist across updates
// Fallback to local path for dev when ELECTRON_USER_DATA is not provided
const userDataPath = process.env.ELECTRON_USER_DATA;
const dbPath = userDataPath
  ? path.join(userDataPath, 'coffeepos.db')
  : path.resolve(__dirname, '../../database', 'coffeepos.db');

/**
 * Inicializa la conexión a la base de datos SQLite
 */
export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar a SQLite:', err.message);
  } else {
    console.log('Conectado a SQLite');
    db.serialize(() => {
      db.run('PRAGMA journal_mode = WAL;');
      db.run('PRAGMA foreign_keys = ON;');
      db.run('PRAGMA busy_timeout = 5000;');
    });
    initializeTables();
  }
});

/**
 * Crea las tablas necesarias si no existen
 */
function initializeTables() {
  const tables = [
    // Tabla de usuarios (primero, por dependencias)
    `CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      usuario TEXT UNIQUE NOT NULL,
      contraseña_hash TEXT NOT NULL,
      rol TEXT DEFAULT 'cajero',
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Tabla de productos
    `CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL,
      categoria TEXT NOT NULL,
      imagen TEXT,
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Tabla de ventas
    `CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      subtotal REAL NOT NULL,
      impuestos REAL NOT NULL,
      total REAL NOT NULL,
      metodo_pago TEXT DEFAULT 'efectivo',
      usuario_id INTEGER,
      caja_id INTEGER,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY (caja_id) REFERENCES cajas(id)
    )`,
    
    // Tabla de detalle de ventas
    `CREATE TABLE IF NOT EXISTS detalle_ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      precio REAL NOT NULL,
      importe REAL NOT NULL,
      personalizaciones TEXT,
      FOREIGN KEY (venta_id) REFERENCES ventas(id),
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )`,
    
    // Tabla de logs
    `CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      accion TEXT NOT NULL,
      detalles TEXT,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )`,

    // Tabla de cajas
    `CREATE TABLE IF NOT EXISTS cajas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      nombre_caja TEXT,
      fondo_inicial REAL DEFAULT 0,
      fecha_apertura DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_cierre DATETIME,
      ventas_efectivo REAL DEFAULT 0,
      ventas_tarjeta REAL DEFAULT 0,
      ventas_transferencia REAL DEFAULT 0,
      ventas_otros REAL DEFAULT 0,
      total_descuentos REAL DEFAULT 0,
      total_devoluciones REAL DEFAULT 0,
      total_esperado REAL DEFAULT 0,
      total_contado REAL DEFAULT 0,
      diferencia REAL DEFAULT 0,
      observaciones TEXT,
      estado TEXT DEFAULT 'abierta',
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )`,

    // Tabla de opciones de personalización
    `CREATE TABLE IF NOT EXISTS personalizaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      nombre TEXT NOT NULL,
      precio_adicional REAL DEFAULT 0,
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Tabla de configuración general
    `CREATE TABLE IF NOT EXISTS configuracion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clave TEXT UNIQUE NOT NULL,
      valor TEXT NOT NULL
    )`,

    // Tabla de nombres de cajas
    `CREATE TABLE IF NOT EXISTS cajas_nombres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      activo INTEGER DEFAULT 1
    )`,

    // Tabla de categorías de productos
    `CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Tabla de ingredientes (almacén)
    `CREATE TABLE IF NOT EXISTS ingredientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      unidad_medida TEXT NOT NULL,
      stock_actual REAL DEFAULT 0,
      stock_minimo REAL DEFAULT 0,
      categoria_reemplazo TEXT,
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Tabla de recetas (ingredientes por producto)
    `CREATE TABLE IF NOT EXISTS recetas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL,
      ingrediente_id INTEGER NOT NULL,
      cantidad REAL NOT NULL,
      FOREIGN KEY (producto_id) REFERENCES productos(id),
      FOREIGN KEY (ingrediente_id) REFERENCES ingredientes(id)
    )`,

    // Tabla de recetas para personalizaciones (extras)
    `CREATE TABLE IF NOT EXISTS recetas_personalizacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      personalizacion_id INTEGER NOT NULL,
      ingrediente_id INTEGER NOT NULL,
      cantidad REAL NOT NULL,
      FOREIGN KEY (personalizacion_id) REFERENCES personalizaciones(id),
      FOREIGN KEY (ingrediente_id) REFERENCES ingredientes(id)
    )`
  ];

  let completed = 0;
  
  tables.forEach((sql, index) => {
    db.run(sql, (err) => {
      if (err) {
        console.error('Error al crear tabla:', err.message);
      }
      completed++;
      
      // Cuando todas las tablas estén creadas, crear el admin y migrar
      if (completed === tables.length) {
        createDefaultAdmin();
        migrateDatabase();
      }
    });
  });
}

/**
 * Crea un usuario administrador por defecto
 */
function createDefaultAdmin() {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  
  db.get(
    'SELECT id FROM usuarios WHERE usuario = ?',
    ['admin'],
    (err, row) => {
      if (err) {
        console.error('Error al verificar admin:', err.message);
        return;
      }
      
      if (!row) {
        db.run(
          'INSERT INTO usuarios (nombre, usuario, contraseña_hash, rol) VALUES (?, ?, ?, ?)',
          ['Administrador', 'admin', hashedPassword, 'admin'],
          (err) => {
            if (err) {
              console.error('Error al crear admin:', err.message);
            } else {
              console.log('Usuario admin creado: admin/admin123');
            }
          }
        );
      }
    }
  );
}

/**
 * Migra la base de datos agregando nuevas columnas si es necesario mediante migraciones estructuradas
 */
async function migrateDatabase() {
  await runMigrations();

  // Inicializar personalizaciones por defecto
  initializeDefaultCustomizations().catch(err => {
    console.error('Error al inicializar personalizaciones:', err);
  });

  // Insertar configuración por defecto si no existe
  db.run(`INSERT OR IGNORE INTO configuracion (clave, valor) VALUES ('permitir_stock_negativo', '0')`);
  db.run(`INSERT OR IGNORE INTO configuracion (clave, valor) VALUES ('tipo_cambio_dolar', '20.00')`);
  
  // Insertar caja por defecto si no existe ninguna
  db.get('SELECT COUNT(*) as count FROM cajas_nombres', [], (err, row) => {
    if (!err && row && row.count === 0) {
      db.run(`INSERT INTO cajas_nombres (nombre) VALUES ('Caja Principal')`);
    }
  });

  // Insertar categorías por defecto si no existen
  const defaultCategories = ['Cafés Calientes', 'Cafés Fríos', 'Frappés', 'Especiales', 'Tés'];
  defaultCategories.forEach(category => {
    db.run(`INSERT OR IGNORE INTO categorias (nombre) VALUES (?)`, [category]);
  });
}

/**
 * Ejecuta una consulta SQL con promesas
 */
export function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Ejecuta una consulta SQL que retorna una sola fila
 */
export function queryOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

/**
 * Ejecuta una consulta SQL de inserción/actualización
 */
export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}
