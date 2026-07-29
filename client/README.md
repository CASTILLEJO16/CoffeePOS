# Coffee POS - Frontend

Frontend para el sistema POS de cafetería.

## Tecnologías

- React 18
- Vite
- React Router 6
- Axios

## Instalación

```bash
cd client
npm install
```

## Ejecución

### Modo desarrollo
```bash
npm run dev
```

### Modo producción
```bash
npm run build
npm run preview
```

## Características

### Panel de Administración (Solo Admin)
- Gestión completa de productos
- Crear, editar, activar, desactivar y eliminar productos
- Gestión de usuarios
- Crear y editar vendedores
- Interfaz con tabs para productos y usuarios

### POS (Punto de Venta)
- Catálogo de productos con imágenes
- Búsqueda de productos
- Filtros por categoría
- Carrito de compras en tiempo real
- Cálculo automático de subtotal, IVA y total
- Selección de método de pago
- Generación de tickets

### Autenticación
- Login de usuarios
- Protección de rutas
- Gestión de sesión

### Diseño
- Interfaz limpia y minimalista
- Diseño responsive
- Animaciones suaves
- Paleta de colores moderna

## Estructura de Componentes

### Admin
- ProductList - Lista de productos con acciones
- ProductForm - Formulario para crear/editar productos
- UserList - Lista de usuarios
- UserForm - Formulario para crear/editar usuarios

### Common
- Button - Botones reutilizables
- Input - Campos de entrada
- Modal - Ventanas modales

### POS
- ProductCard - Tarjeta de producto
- OrderItem - Item de la orden
- OrderSummary - Resumen de la orden

### Pages
- POS - Punto de venta principal
- Login - Página de inicio de sesión
- Admin - Panel de administración (solo admin)

### Context
- OrderContext - Estado de la orden
- AuthContext - Estado de autenticación

## Servicios

- api - Configuración de Axios
- productService - Operaciones con productos
- saleService - Operaciones con ventas
- authService - Operaciones de autenticación

## Usuarios por defecto

### Administrador
- **Usuario**: admin
- **Contraseña**: admin123
- **Acceso**: POS completo + Panel de administración

### Vendedor
- **Usuario**: vendedor
- **Contraseña**: vendedor123
- **Acceso**: Solo POS (ventas)
