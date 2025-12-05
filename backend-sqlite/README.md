# Backend SQLite - Gestor de Inventario J4 Pro

Backend completo para gestión de inventarios y contabilidad construido con Node.js y SQLite.

## 🚀 Características

- ✅ API REST completa con todos los endpoints necesarios
- ✅ Base de datos SQLite con better-sqlite3 (máximo rendimiento)
- ✅ WebSockets (Socket.IO) para colaboración en tiempo real
- ✅ Autenticación JWT con refresh tokens
- ✅ Autorización basada en roles
- ✅ Generación de códigos QR para invitaciones
- ✅ Sistema de logging con Winston
- ✅ Validación de datos con Joi
- ✅ Manejo de errores centralizado
- ✅ Rate limiting para prevenir abuso
- ✅ CORS configurado
- ✅ Helmet para seguridad HTTP
- ✅ Compresión de respuestas
- ✅ Soporte para modo offline

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn

## 🔧 Instalación

1. **Instalar dependencias**

```bash
npm install
```

2. **Configurar variables de entorno**

Copiar el archivo `.env.example` a `.env` y configurar:

```bash
cp .env.example .env
```

Editar `.env` con tus configuraciones:

```env
NODE_ENV=development
PORT=4000
JWT_SECRET=tu_secreto_aqui
JWT_REFRESH_SECRET=tu_refresh_secret_aqui
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8081
```

3. **Ejecutar migraciones** (Opcional - se ejecutan automáticamente)

```bash
npm run migrate
```

## 🏃 Ejecución

### Desarrollo

```bash
npm run dev
```

### Producción

```bash
npm start
```

El servidor estará disponible en: `http://localhost:4000`

## 📡 Endpoints Principales

### Autenticación (`/api/auth`)

- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/registro` - Registrar usuario
- `POST /api/auth/refresh` - Renovar token
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/perfil` - Obtener perfil (requiere auth)

### Clientes (`/api/clientes-negocios`)

- `GET /api/clientes-negocios` - Listar clientes
- `POST /api/clientes-negocios` - Crear cliente
- `GET /api/clientes-negocios/:id` - Obtener cliente
- `PUT /api/clientes-negocios/:id` - Actualizar cliente
- `DELETE /api/clientes-negocios/:id` - Desactivar cliente

### Productos (`/api/productos`)

**Productos Generales:**
- `GET /api/productos/generales` - Listar productos generales
- `POST /api/productos/generales` - Crear producto general
- `GET /api/productos/generales/:id` - Obtener producto
- `PUT /api/productos/generales/:id` - Actualizar producto
- `GET /api/productos/generales/categorias` - Obtener categorías
- `GET /api/productos/generales/buscar/codigo-barras/:codigo` - Buscar por código

**Productos de Cliente:**
- `GET /api/productos/cliente/:clienteId` - Listar productos del cliente
- `POST /api/productos/cliente/:clienteId` - Crear producto para cliente
- `POST /api/productos/cliente/:clienteId/asignar` - Asignar productos generales
- `PUT /api/productos/:id` - Actualizar producto
- `DELETE /api/productos/:id` - Eliminar producto

### Sesiones de Inventario (`/api/sesiones-inventario`)

- `GET /api/sesiones-inventario` - Listar sesiones
- `POST /api/sesiones-inventario` - Crear sesión
- `GET /api/sesiones-inventario/:id` - Obtener sesión
- `POST /api/sesiones-inventario/:id/productos` - Agregar producto
- `PUT /api/sesiones-inventario/:id/productos/:productoId` - Actualizar producto
- `DELETE /api/sesiones-inventario/:id/productos/:productoId` - Remover producto
- `PUT /api/sesiones-inventario/:id/financieros` - Actualizar datos financieros
- `PATCH /api/sesiones-inventario/:id/completar` - Completar sesión
- `PATCH /api/sesiones-inventario/:id/timer/pause` - Pausar cronómetro
- `PATCH /api/sesiones-inventario/:id/timer/resume` - Reanudar cronómetro

### Invitaciones QR (`/api/invitaciones`)

- `POST /api/invitaciones/generar` - Generar invitación (protegido)
- `GET /api/invitaciones/activas` - Listar activas (protegido)
- `POST /api/invitaciones/validar` - Validar código (público)
- `POST /api/invitaciones/usar` - Usar invitación (público)

### Solicitudes de Conexión (`/api/solicitudes-conexion`)

- `POST /api/solicitudes-conexion/solicitar` - Crear solicitud (público)
- `GET /api/solicitudes-conexion/estado/:id` - Ver estado (público)
- `GET /api/solicitudes-conexion/pendientes` - Listar pendientes (protegido)
- `POST /api/solicitudes-conexion/:id/aceptar` - Aceptar (protegido)
- `POST /api/solicitudes-conexion/:id/rechazar` - Rechazar (protegido)

### Salud (`/api/salud`)

- `GET /api/salud` - Estado del servidor
- `GET /api/salud/db` - Estado de la base de datos
- `GET /api/salud/sistema` - Información del sistema

## 🔌 WebSockets

### Eventos del Cliente → Servidor

- `join_session` - Unirse a una sesión
  ```js
  socket.emit('join_session', { sessionId: 123 })
  ```

- `leave_session` - Salir de una sesión
  ```js
  socket.emit('leave_session', { sessionId: 123 })
  ```

- `producto_actualizado` - Notificar actualización
  ```js
  socket.emit('producto_actualizado', { sessionId: 123, producto: {...} })
  ```

### Eventos del Servidor → Cliente

- `usuario_conectado` - Nuevo usuario en sesión
- `usuario_desconectado` - Usuario salió de sesión
- `producto_actualizado` - Producto actualizado por otro usuario
- `sesion_completada` - Sesión completada

### Conexión con autenticación

```javascript
import io from 'socket.io-client'

const socket = io('http://localhost:4000', {
  auth: {
    token: 'tu_jwt_token'
  }
})
```

## 📂 Estructura del Proyecto

```
backend-sqlite/
├── src/
│   ├── config/          # Configuración (DB, env)
│   ├── models/          # Modelos de datos
│   ├── controllers/     # Controladores (lógica de negocio)
│   ├── routes/          # Rutas de la API
│   ├── middlewares/     # Middlewares (auth, validación)
│   ├── services/        # Servicios (Socket.IO, PDF, QR)
│   ├── utils/           # Utilidades (logger, helpers)
│   ├── migrations/      # Migraciones de BD
│   └── server.js        # Punto de entrada
├── database/            # Base de datos SQLite
│   ├── inventario.db
│   └── backups/
├── logs/                # Archivos de log
├── .env                 # Variables de entorno
├── .env.example         # Ejemplo de variables
├── package.json
└── README.md
```

## 🗄️ Modelos de Datos

### Usuario
- Gestión de usuarios con roles (administrador, contable, contador, colaborador)
- Autenticación con JWT y refresh tokens
- Relaciones jerárquicas (contable principal)

### ClienteNegocio
- Información del cliente/negocio
- Configuración de inventario personalizada
- Estadísticas de uso

### ProductoGeneral
- Catálogo general de productos
- Categorías y unidades de medida
- Códigos de barras
- Unidades internas y tipos de contenedor

### ProductoCliente
- Productos específicos de cada cliente
- Precios personalizados
- Estadísticas de conteo

### SesionInventario
- Sesiones de inventario con cronómetro
- Productos contados
- Datos financieros (balance)
- Colaboradores en tiempo real

### Invitacion
- Códigos QR para acceso temporal
- Expiración automática

### SolicitudConexion
- Sistema de conexión para colaboradores
- Productos offline para sincronización

### HistorialSesion
- Auditoría de cambios en sesiones

## 🔐 Autenticación y Autorización

### Roles

- **administrador**: Acceso total
- **contable/contador**: Gestiona clientes, productos, sesiones, subordinados
- **colaborador**: Acceso limitado a sesiones asignadas

### Tokens JWT

**Access Token:**
- Duración: 15 minutos (configurable)
- Se envía en header: `Authorization: Bearer <token>`

**Refresh Token:**
- Duración: 7 días (configurable)
- Se usa para renovar el access token
- Se almacena en la base de datos

## 🛡️ Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Tokens JWT firmados
- ✅ Validación de datos con Joi
- ✅ Rate limiting por IP
- ✅ Helmet para headers de seguridad
- ✅ CORS configurado
- ✅ SQL injection prevention (prepared statements)

## 📊 Base de Datos

### SQLite con better-sqlite3

- **WAL mode**: Mejor concurrencia
- **Foreign keys**: Integridad referencial
- **Triggers**: Actualización automática de timestamps
- **Índices**: Optimización de consultas frecuentes

### Backups

Los backups se pueden crear manualmente o automáticamente:

```javascript
import dbManager from './src/config/database.js'

// Crear backup
dbManager.backup('./database/backups/backup_manual.db')
```

## 🧪 Testing

Actualmente en desarrollo. Para probar endpoints:

### Con curl:

```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"123456"}'

# Obtener clientes (con token)
curl http://localhost:4000/api/clientes-negocios \
  -H "Authorization: Bearer <tu_token>"
```

### Con Postman/Insomnia:

Importar la colección de endpoints (próximamente).

## 🚀 Despliegue

### Producción

1. Configurar variables de entorno en `.env`:
   ```env
   NODE_ENV=production
   PORT=4000
   JWT_SECRET=secreto_muy_seguro_aqui
   ```

2. Instalar dependencias de producción:
   ```bash
   npm ci --omit=dev
   ```

3. Iniciar con PM2 (recomendado):
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name "inventario-backend"
   pm2 save
   pm2 startup
   ```

## 📝 Notas Importantes

### Compatibilidad con Frontends

Este backend es **100% compatible** con:
- Frontend Web (React + Vite)
- Frontend Mobile (React Native + Expo)
- Frontend Desktop (Electron + React + Vite)

### Rutas Alternativas

Algunos endpoints tienen rutas alternativas para compatibilidad:
- `/api/clientes-negocios` = `/api/clientes`

### Formato de Respuesta

Todas las respuestas exitosas siguen el formato:

```json
{
  "exito": true,
  "mensaje": "Operación exitosa",
  "datos": { ... }
}
```

Errores:

```json
{
  "exito": false,
  "mensaje": "Descripción del error",
  "detalles": [ ... ]
}
```

## 🐛 Troubleshooting

### Error: "SQLITE_CANTOPEN"
- Verificar que el directorio `database/` existe
- Verificar permisos de escritura

### Error: "EADDRINUSE"
- El puerto ya está en uso
- Cambiar `PORT` en `.env`
- O matar el proceso: `npx kill-port 4000`

### Error de CORS
- Agregar tu origin a `ALLOWED_ORIGINS` en `.env`
- Verificar que el frontend use la URL correcta

### WebSocket no conecta
- Verificar que el token JWT sea válido
- Verificar que el usuario esté activo
- Revisar logs del servidor

## 📚 Recursos Adicionales

- [Documentación SQLite](https://www.sqlite.org/docs.html)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Socket.IO](https://socket.io/docs/v4/)
- [Express.js](https://expressjs.com/)
- [JWT](https://jwt.io/)

## 🤝 Soporte

Para problemas o preguntas:
1. Revisar los logs en `logs/`
2. Verificar configuración en `.env`
3. Consultar este README

---

**Desarrollado para J4 Pro** - Sistema de Gestión de Inventarios v1.0.0
