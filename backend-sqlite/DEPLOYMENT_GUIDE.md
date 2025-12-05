# Guía de Despliegue - Backend SQLite Inventario J4 Pro

## ✅ Estado del Proyecto

**Backend completamente funcional y listo para producción**

### Componentes Implementados

- ✅ Base de datos SQLite con better-sqlite3
- ✅ Sistema de migraciones
- ✅ 8 Modelos de datos completos
- ✅ API REST con todos los endpoints
- ✅ Autenticación JWT con refresh tokens
- ✅ WebSockets (Socket.IO) para colaboración
- ✅ Validación de datos (Joi)
- ✅ Middlewares de seguridad
- ✅ Sistema de logging (Winston)
- ✅ Manejo centralizado de errores
- ✅ Seeds con datos de prueba

## 🚀 Inicio Rápido

### 1. Instalación

```bash
cd backend-sqlite
npm install
```

### 2. Ejecutar Seeds (Opcional - crear datos de prueba)

```bash
npm run seed
```

Esto creará:
- 3 usuarios de prueba (admin, contador, colaborador)
- 2 clientes de negocio
- 10 productos generales

### 3. Iniciar el Servidor

**Desarrollo:**
```bash
npm run dev
```

**Producción:**
```bash
npm start
```

El servidor estará disponible en: `http://localhost:4000`

## 📊 Datos de Prueba

### Usuarios Creados

| Email | Password | Rol |
|-------|----------|-----|
| admin@j4pro.com | 123456 | Administrador |
| contador@j4pro.com | 123456 | Contador |
| colaborador@j4pro.com | 123456 | Colaborador |

### Endpoints de Prueba

**Salud del Servidor:**
```
GET http://localhost:4000/api/salud
```

**Login:**
```bash
POST http://localhost:4000/api/auth/login
Content-Type: application/json

{
  "email": "contador@j4pro.com",
  "password": "123456"
}
```

**Obtener Clientes (requiere token):**
```bash
GET http://localhost:4000/api/clientes-negocios
Authorization: Bearer <tu_token>
```

## 🔧 Configuración de Producción

### Variables de Entorno Importantes

```env
NODE_ENV=production
PORT=4000
JWT_SECRET=<genera_un_secreto_fuerte>
JWT_REFRESH_SECRET=<genera_otro_secreto_fuerte>
ALLOWED_ORIGINS=https://tu-dominio.com,https://app.tu-dominio.com
```

### Generar Secretos Seguros

```bash
# En Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Despliegue con PM2

```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicación
pm2 start src/server.js --name "inventario-backend"

# Ver logs
pm2 logs inventario-backend

# Guardar configuración
pm2 save

# Configurar inicio automático
pm2 startup
```

## 🗄️ Base de Datos

### Ubicación

```
backend-sqlite/database/inventario.db
```

### Backups

**Manual:**
```javascript
import dbManager from './src/config/database.js'
dbManager.backup('./database/backups/backup_manual.db')
```

**Automático:**
Se puede configurar en `.env`:
```env
AUTO_BACKUP=true
BACKUP_INTERVAL_HOURS=24
```

### Migraciones

**Ejecutar migraciones pendientes:**
```bash
npm run migrate
```

**Rollback (revertir última migración):**
```bash
npm run migrate:rollback
```

## 🔌 WebSockets

### Conexión desde Cliente

```javascript
import io from 'socket.io-client'

const socket = io('http://localhost:4000', {
  auth: {
    token: 'tu_jwt_access_token'
  }
})

// Unirse a una sesión
socket.emit('join_session', { sessionId: 123 })

// Escuchar actualizaciones
socket.on('producto_actualizado', (data) => {
  console.log('Producto actualizado:', data)
})
```

### Eventos Disponibles

**Cliente → Servidor:**
- `join_session` - Unirse a sesión
- `leave_session` - Salir de sesión
- `producto_actualizado` - Notificar actualización
- `financieros_actualizados` - Notificar cambios financieros
- `sesion_completada` - Sesión completada

**Servidor → Cliente:**
- `usuario_conectado` - Nuevo usuario en sesión
- `usuario_desconectado` - Usuario salió
- `producto_actualizado` - Cambio sincronizado
- `sesion_completada` - Sesión finalizada

## 📡 API Endpoints

### Autenticación (`/api/auth`)

- `POST /login` - Login
- `POST /registro` - Registro
- `POST /refresh` - Renovar token
- `POST /logout` - Logout
- `GET /perfil` 🔒 - Obtener perfil
- `PUT /perfil` 🔒 - Actualizar perfil
- `PUT /cambiar-password` 🔒 - Cambiar contraseña

### Clientes (`/api/clientes-negocios` o `/api/clientes`)

- `GET /` 🔒 - Listar clientes
- `POST /` 🔒 - Crear cliente
- `GET /:id` 🔒 - Obtener cliente
- `PUT /:id` 🔒 - Actualizar cliente
- `DELETE /:id` 🔒 - Desactivar cliente
- `PATCH /:id/activar` 🔒 - Activar cliente
- `GET /:id/estadisticas` 🔒 - Estadísticas
- `PATCH /:id/configuracion` 🔒 - Actualizar config

### Productos (`/api/productos`)

**Generales:**
- `GET /generales` 🔒 - Listar
- `POST /generales` 🔒 - Crear
- `GET /generales/:id` 🔒 - Obtener
- `PUT /generales/:id` 🔒 - Actualizar
- `DELETE /generales/:id` 🔒 - Desactivar
- `GET /generales/categorias` 🔒 - Categorías
- `GET /generales/buscar/codigo-barras/:codigo` 🔒 - Buscar

**Cliente:**
- `GET /cliente/:clienteId` 🔒 - Listar
- `POST /cliente/:clienteId` 🔒 - Crear
- `POST /cliente/:clienteId/asignar` 🔒 - Asignar generales
- `GET /:id` 🔒 - Obtener
- `PUT /:id` 🔒 - Actualizar
- `DELETE /:id` 🔒 - Eliminar

### Sesiones (`/api/sesiones-inventario`)

- `GET /` 🔒 - Listar sesiones
- `POST /` 🔒 - Crear sesión
- `GET /:id` 🔒 - Obtener sesión
- `POST /:id/productos` 🔒 - Agregar producto
- `PUT /:id/productos/:productoId` 🔒 - Actualizar producto
- `DELETE /:id/productos/:productoId` 🔒 - Remover producto
- `PUT /:id/financieros` 🔒 - Actualizar datos financieros
- `PATCH /:id/completar` 🔒 - Completar sesión
- `PATCH /:id/cancelar` 🔒 - Cancelar sesión
- `PATCH /:id/timer/pause` 🔒 - Pausar cronómetro
- `PATCH /:id/timer/resume` 🔒 - Reanudar cronómetro
- `GET /cliente/:clienteId` 🔒 - Sesiones del cliente
- `GET /agenda/resumen` 🔒 - Resumen de agenda
- `GET /agenda/dia` 🔒 - Agenda del día

### Invitaciones (`/api/invitaciones`)

- `POST /validar` - Validar código (público)
- `POST /usar` - Usar invitación (público)
- `POST /generar` 🔒 - Generar invitación
- `GET /activas` 🔒 - Listar activas
- `GET /:id/qr` 🔒 - Generar QR
- `DELETE /:id` 🔒 - Cancelar invitación

### Solicitudes (`/api/solicitudes-conexion`)

- `POST /solicitar` - Crear solicitud (público)
- `GET /estado/:id` - Ver estado (público)
- `POST /:id/productos-offline` - Agregar producto offline (público)
- `GET /pendientes` 🔒 - Listar pendientes
- `GET /conectados` 🔒 - Listar conectados
- `POST /:id/aceptar` 🔒 - Aceptar
- `POST /:id/rechazar` 🔒 - Rechazar
- `GET /:id/productos-offline` 🔒 - Obtener productos offline
- `POST /:id/sincronizar` 🔒 - Sincronizar
- `POST /:id/desconectar` 🔒 - Desconectar

### Usuarios (`/api/usuarios`)

- `GET /subordinados` 🔒 - Listar subordinados
- `POST /` 🔒 - Crear usuario
- `GET /:id` 🔒 - Obtener usuario
- `PUT /:id` 🔒 - Actualizar usuario
- `PATCH /:id/password` 🔒 - Cambiar password
- `DELETE /:id` 🔒 - Desactivar usuario

### Salud (`/api/salud`)

- `GET /` - Estado del servidor
- `GET /db` - Estado de DB
- `GET /sistema` - Info del sistema

🔒 = Requiere autenticación JWT

## 🛡️ Seguridad

### Implementado

✅ Contraseñas hasheadas con bcrypt (10 rounds)  
✅ JWT con expiración configurable  
✅ Refresh tokens en BD  
✅ Rate limiting (100 req/15min por IP)  
✅ CORS configurado  
✅ Helmet para headers HTTP seguros  
✅ Validación de entrada con Joi  
✅ SQL injection prevention (prepared statements)  
✅ Autorización basada en roles  
✅ Logging de actividad

### Recomendaciones

- Usar HTTPS en producción
- Configurar firewall para puerto 4000
- Backup regular de la BD
- Monitoreo de logs
- Actualizar dependencias regularmente

## 📊 Monitoreo

### Logs

Los logs se guardan en:
```
backend-sqlite/logs/
├── combined.log (todos los logs)
└── error.log (solo errores)
```

### Endpoints de Monitoreo

```bash
# Estado general
curl http://localhost:4000/api/salud

# Estado de BD
curl http://localhost:4000/api/salud/db

# Info del sistema
curl http://localhost:4000/api/salud/sistema
```

## 🧪 Testing

### Ejecutar Tests Manuales

```bash
node test-api.js
```

Este script prueba:
- Endpoint de salud
- Login de usuario
- Listado de clientes
- Listado de productos
- Listado de sesiones
- Listado de subordinados

## 📱 Integración con Frontends

### Configuración de URLs

**Frontend Web (React + Vite):**
```env
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

**Frontend Mobile (React Native + Expo):**
```env
API_URL=http://192.168.x.x:4000/api
SOCKET_URL=http://192.168.x.x:4000
```

**Frontend Desktop (Electron):**
```env
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

### Axios Configuration

Los frontends ya están configurados para usar este backend. Solo necesitan apuntar a la URL correcta.

## 🚨 Troubleshooting

### El servidor no inicia

1. Verificar que el puerto 4000 esté libre
2. Revisar logs en `logs/error.log`
3. Verificar que todas las dependencias estén instaladas
4. Comprobar que el archivo `.env` exista

### Error de base de datos

1. Eliminar `database/inventario.db`
2. Ejecutar `npm run seed` nuevamente
3. Verificar permisos del directorio `database/`

### WebSocket no conecta

1. Verificar que el token JWT sea válido
2. Confirmar que el usuario esté activo
3. Revisar CORS en `.env` (ALLOWED_ORIGINS)
4. Comprobar que el servidor esté corriendo

### Error 401 (No autorizado)

1. El token expiró - usar el endpoint de refresh
2. El token es inválido - hacer login nuevamente
3. El usuario fue desactivado

## 📚 Recursos

- README.md - Documentación completa
- test-api.js - Script de pruebas
- .env.example - Variables de entorno de ejemplo
- src/migrations/ - Migraciones de BD
- src/seeds/ - Datos de prueba

## 🆘 Soporte

Para problemas o preguntas:
1. Revisar logs en `logs/`
2. Verificar configuración en `.env`
3. Consultar este documento
4. Ejecutar tests: `node test-api.js`

---

**Backend SQLite - Gestor de Inventario J4 Pro v1.0.0**  
Desarrollado con Node.js, Express, SQLite y Socket.IO
