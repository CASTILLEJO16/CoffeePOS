import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/config.js';
import { requestLogger } from './middlewares/logMiddleware.js';
import { errorHandler, notFoundHandler } from './middlewares/errorMiddleware.js';
import { attachBranch } from './middlewares/branchMiddleware.js';

// Importar rutas
import productRoutes from './routes/productRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import customizationRoutes from './routes/customizationRoutes.js';
import cashRegisterRoutes from './routes/cashRegisterRoutes.js';
import almacenRoutes from './routes/almacenRoutes.js';
import configRoutes from './routes/configRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import { run } from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar Express
const app = express();

// Middlewares globales
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(cors({ origin: ['http://localhost:5173'], credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(requestLogger);
// Attach branch (multi-sucursal fase 1)
app.use(attachBranch);

// Ensure DB schema (lightweight migration)
async function ensureSchema() {
  try {
    await run(`ALTER TABLE ventas ADD COLUMN cancelada INTEGER DEFAULT 0`);
  } catch (e) {
    // ignore if already exists
  }
  try {
    await run(`ALTER TABLE ventas ADD COLUMN branch_id INTEGER DEFAULT 1`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE cajas ADD COLUMN branch_id INTEGER DEFAULT 1`);
  } catch (e) {}
}

ensureSchema();

// Rate limit global para API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use('/api', apiLimiter);

// Servir imágenes de productos como archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rutas API
app.use('/api/productos', productRoutes);
app.use('/api/ventas', saleRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/personalizaciones', customizationRoutes);
app.use('/api/cajas', cashRegisterRoutes);
app.use('/api/almacen', almacenRoutes);
app.use('/api/configuracion', configRoutes);
app.use('/api/categorias', categoryRoutes);

// Ruta de health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Coffee POS API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores
app.use(notFoundHandler);
app.use(errorHandler);

// Iniciar servidor
app.listen(config.port, () => {
  console.log(`🚀 Servidor Coffee POS corriendo en puerto ${config.port}`);
  console.log(`📡 API disponible en http://localhost:${config.port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🔑 Usuario admin por defecto: admin / admin123`);
  }
});

export default app;
