# Coffee POS - Backend

Backend para el sistema POS de cafetería.

## Tecnologías

- Node.js
- Express
- SQLite3
- JWT (JSON Web Tokens)
- bcryptjs

## Instalación

```bash
cd server
npm install
```

## Configuración

El archivo `.env` contiene la configuración:

```
PORT=3001
DB_PATH=./database/coffeepos.db
JWT_SECRET=your_jwt_secret_key_change_in_production
IVA_RATE=0.16
```

## Ejecución

### Modo desarrollo
```bash
npm run dev
```

### Modo producción
```bash
npm start
```

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/verify` - Verificar token

### Productos
- `GET /api/productos` - Listar productos activos
- `GET /api/productos/categorias` - Listar categorías
- `GET /api/productos/:id` - Obtener producto por ID
- `POST /api/productos` - Crear producto (admin)
- `PUT /api/productos/:id` - Actualizar producto (admin)
- `PATCH /api/productos/:id/activar` - Activar producto (admin)
- `PATCH /api/productos/:id/desactivar` - Desactivar producto (admin)
- `DELETE /api/productos/:id` - Eliminar producto (admin)

### Ventas
- `GET /api/ventas` - Listar ventas
- `GET /api/ventas/resumen` - Resumen diario
- `GET /api/ventas/:id` - Obtener venta por ID
- `POST /api/ventas` - Crear venta
- `POST /api/ventas/:id/cancelar` - Cancelar venta
- `POST /api/ventas/:id/imprimir` - Imprimir ticket

### Usuarios
- `GET /api/usuarios` - Listar usuarios (admin)
- `GET /api/usuarios/:id` - Obtener usuario por ID (admin)
- `POST /api/usuarios` - Crear usuario (admin)
- `PUT /api/usuarios/:id` - Actualizar usuario (admin)

## Usuarios por defecto

### Administrador
- **Usuario**: admin
- **Contraseña**: admin123
- **Rol**: administrador
- **Acceso**: Completo a todos los endpoints

### Vendedor
- **Usuario**: vendedor
- **Contraseña**: vendedor123
- **Rol**: cajero
- **Acceso**: Solo endpoints de ventas y productos públicos

⚠️ **Importante**: Cambiar las contraseñas en producción.

## Estructura de Base de Datos

### productos
- id
- nombre
- precio
- categoria
- imagen
- activo
- created_at

### ventas
- id
- fecha
- subtotal
- impuestos
- total
- metodo_pago
- usuario_id

### detalle_ventas
- id
- venta_id
- producto_id
- cantidad
- precio
- importe

### usuarios
- id
- nombre
- usuario
- contraseña_hash
- rol
- activo
- created_at

### logs
- id
- usuario_id
- accion
- detalles
- fecha
