# Coffee POS - Sistema de Punto de Venta para Cafetería

Sistema POS moderno para cafeterías con arquitectura modular y escalable.

## 🏗️ Arquitectura

```
coffePOS/
├── client/          # Frontend React
├── server/          # Backend Node.js + Express
└── database/        # SQLite
```

## 🛠️ Tecnologías

### Frontend
- React 18
- Vite
- React Router 6
- Axios
- CSS moderno (Flexbox/Grid)

### Backend
- Node.js 18
- Express 4
- SQLite3
- JWT (autenticación)
- bcryptjs (hashing)

## 📦 Instalación

### Requisitos previos
- Node.js 18+
- npm

### Backend

```bash
cd server
npm install
npm start
```

El backend corre en http://localhost:3001

### Frontend

```bash
cd client
npm install
npm run dev
```

El frontend corre en http://localhost:3000

## 🔑 Credenciales por defecto

### Administrador
- **Usuario**: admin
- **Contraseña**: admin123
- **Rol**: administrador
- **Acceso**: Completo (POS, administración de productos, gestión de usuarios)

### Vendedor
- **Usuario**: vendedor
- **Contraseña**: vendedor123
- **Rol**: cajero
- **Acceso**: Solo POS (ventas)

⚠️ **Importante**: Cambiar las contraseñas en producción.

## � Roles y Permisos

### Administrador
- **Acceso completo** al sistema
- **Panel de administración**: Gestión de productos y usuarios
- **POS**: Todas las funciones de venta
- **Reportes**: Acceso a resumen de ventas y cancelación de ventas
- **Usuarios**: Puede crear, editar y gestionar vendedores

### Vendedor (Cajero)
- **Acceso limitado** solo a ventas
- **POS**: Agregar productos, completar ventas, imprimir tickets
- **Sin acceso** a panel de administración
- **Sin acceso** a gestión de productos o usuarios
- **Sin acceso** a cancelación de ventas o reportes

## �📋 Características Implementadas (Fase 1)

### POS (Punto de Venta)
- ✅ Catálogo de productos con tarjetas visuales
- ✅ Búsqueda de productos en tiempo real
- ✅ Filtros por categoría
- ✅ Carrito dinámico (sumar/restar productos en tiempo real)
- ✅ Cálculo automático de subtotal, IVA dinámico y total
- ✅ Configuración de IVA desde panel admin (en tiempo real)
- ✅ Métodos de pago: efectivo, tarjeta, USD
- ✅ Flujo preparado para integración con terminal bancaria (simulado listo para producción)
- ✅ Registro de ventas en base de datos
- ✅ Generación de tickets profesionales (con extras y desglose)

### Autenticación
- ✅ Login de usuarios
- ✅ Protección de rutas con JWT
- ✅ Gestión de sesión
- ✅ Diferenciación de roles (Admin vs Vendedor)
- ✅ Panel de administración exclusivo para admin

### Base de Datos
- ✅ Tabla de productos
- ✅ Tabla de ventas
- ✅ Tabla de detalle de ventas
- ✅ Tabla de usuarios
- ✅ Tabla de logs (auditoría)
- ✅ Configuración dinámica (IVA, stock, etc.)

### API REST
- ✅ Endpoints para productos (CRUD)
- ✅ Endpoints para ventas
- ✅ Endpoints para autenticación
- ✅ Endpoints para usuarios

### Panel de Administración (Admin)
- ✅ Gestión completa de productos (crear, editar, activar, desactivar, eliminar)
- ✅ Gestión de usuarios (crear vendedores, editar usuarios)
- ✅ Visualización de todos los productos (activos e inactivos)
- ✅ Interfaz diferenciada por rol
- ✅ POS independiente para administrador
- ✅ Control de caja (apertura, cierre y cortes)
- ✅ Historial de cortes de caja con exportación a PDF

## 🎨 Diseño

- Interfaz limpia y minimalista
- Paleta de colores moderna (blanco, gris, negro)
- Animaciones suaves
- Diseño responsive
- Tipografía clara y legible

## 📅 Roadmap (Fases futuras)

### Fase 2
- ✅ Inventario básico (ingredientes)
- ✅ Recetas por producto
- ✅ Descuento automático de stock (ingredientes o productos)
- ✅ Control de stock negativo configurable

### Fase 3
- [ ] Clientes
- [ ] Programa de puntos
- [ ✅] Historial de compras

### Fase 4
- [ ] Mesas
- [ ] Pedidos en línea
- [ ] Integración con plataformas de delivery
- [ ] Integración real con terminal bancaria (Stripe / MercadoPago / Banco)

### Fase 5
- [ ] Facturación electrónica
- [ ] Reportes avanzados
- [✅] Múltiples sucursales

## 📁 Estructura de Base de Datos

### productos
- id, nombre, precio, categoria, imagen, activo, created_at

### ventas
- id, fecha, subtotal, impuestos, total, metodo_pago, usuario_id, iva_rate

### detalle_ventas
- id, venta_id, producto_id, cantidad, precio, importe, personalizaciones

### usuarios
- id, nombre, usuario, contraseña_hash, rol, activo, created_at

### logs
- id, usuario_id, accion, detalles, fecha

## 🔒 Seguridad

- Contraseñas hasheadas con bcrypt
- Tokens JWT para autenticación
- Middleware de autorización
- Logs de auditoría

## 🚀 Scripts

### Backend
```bash
cd server
npm start      # Producción
npm run dev    # Desarrollo (con --watch)
```

### Frontend
```bash
cd client
npm run dev    # Desarrollo
npm run build  # Build para producción
npm run preview # Preview de producción
```

## 📝 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/verify` - Verificar token

### Productos
- `GET /api/productos` - Listar productos activos
- `GET /api/productos/categorias` - Listar categorías
- `GET /api/productos/:id` - Obtener producto
- `POST /api/productos` - Crear producto (admin)
- `PUT /api/productos/:id` - Actualizar producto (admin)
- `PATCH /api/productos/:id/activar` - Activar producto (admin)
- `PATCH /api/productos/:id/desactivar` - Desactivar producto (admin)
- `DELETE /api/productos/:id` - Eliminar producto (admin)

### Ventas
- `GET /api/ventas` - Listar ventas
- `GET /api/ventas/resumen` - Resumen diario
- `GET /api/ventas/:id` - Obtener venta con detalles
- `POST /api/ventas` - Crear venta
- `POST /api/ventas/:id/cancelar` - Cancelar venta
- `POST /api/ventas/:id/imprimir` - Imprimir ticket

### Usuarios
- `GET /api/usuarios` - Listar usuarios (admin)
- `GET /api/usuarios/:id` - Obtener usuario (admin)
- `POST /api/usuarios` - Crear usuario (admin)
- `PUT /api/usuarios/:id` - Actualizar usuario (admin)

## 👥 Autores

Desarrollado como sistema POS modular y escalable para cafeterías.

## 📄 Licencia

ISC
