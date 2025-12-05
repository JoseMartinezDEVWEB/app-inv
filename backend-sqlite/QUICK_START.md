# 🚀 Quick Start - Backend SQLite

## Inicio en 3 Pasos

### 1️⃣ Instalar dependencias
```bash
cd backend-sqlite
npm install
```

### 2️⃣ Crear datos de prueba
```bash
npm run seed
```

### 3️⃣ Iniciar servidor
```bash
npm run dev
```

✅ **Servidor corriendo en:** http://localhost:4000

---

## 🔑 Credenciales de Prueba

| Email | Password | Rol |
|-------|----------|-----|
| admin@j4pro.com | 123456 | Administrador |
| contador@j4pro.com | 123456 | Contador |
| colaborador@j4pro.com | 123456 | Colaborador |

---

## 🧪 Probar API

### Con curl:
```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"contador@j4pro.com\",\"password\":\"123456\"}"

# Salud
curl http://localhost:4000/api/salud
```

### Con script incluido:
```bash
node test-api.js
```

---

## 📡 Endpoints Principales

- **API Base:** `http://localhost:4000/api`
- **WebSocket:** `http://localhost:4000`

### Autenticación
```
POST /api/auth/login
POST /api/auth/registro
POST /api/auth/refresh
```

### Clientes
```
GET    /api/clientes-negocios
POST   /api/clientes-negocios
GET    /api/clientes-negocios/:id
PUT    /api/clientes-negocios/:id
```

### Productos
```
GET    /api/productos/generales
POST   /api/productos/generales
GET    /api/productos/cliente/:clienteId
POST   /api/productos/cliente/:clienteId
```

### Sesiones
```
GET    /api/sesiones-inventario
POST   /api/sesiones-inventario
GET    /api/sesiones-inventario/:id
POST   /api/sesiones-inventario/:id/productos
PATCH  /api/sesiones-inventario/:id/completar
```

🔒 = Requiere header: `Authorization: Bearer <token>`

---

## 🔌 WebSocket (Colaboración)

```javascript
import io from 'socket.io-client'

const socket = io('http://localhost:4000', {
  auth: { token: 'tu_jwt_token' }
})

// Unirse a sesión
socket.emit('join_session', { sessionId: 123 })

// Escuchar cambios
socket.on('producto_actualizado', (data) => {
  console.log(data)
})
```

---

## ⚙️ Configurar Frontends

### Web/Desktop (.env)
```env
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

### Mobile (.env)
```env
API_URL=http://192.168.x.x:4000/api
SOCKET_URL=http://192.168.x.x:4000
```

*Reemplaza `192.168.x.x` con tu IP local*

---

## 📂 Estructura de Respuestas

### Éxito
```json
{
  "exito": true,
  "mensaje": "Operación exitosa",
  "datos": { ... }
}
```

### Error
```json
{
  "exito": false,
  "mensaje": "Descripción del error",
  "detalles": [ ... ]
}
```

---

## 🔧 Comandos Útiles

```bash
npm run dev           # Desarrollo (auto-reload)
npm start             # Producción
npm run seed          # Crear datos de prueba
npm run migrate       # Ejecutar migraciones
node test-api.js      # Probar endpoints
```

---

## 📚 Más Información

- **README.md** - Documentación completa
- **DEPLOYMENT_GUIDE.md** - Guía de despliegue
- **RESUMEN_PROYECTO.md** - Resumen del proyecto

---

## 🆘 Problemas Comunes

### Puerto ocupado
```bash
# Cambiar puerto en .env
PORT=5000
```

### Error de base de datos
```bash
# Recrear BD
rm database/inventario.db
npm run seed
```

### CORS error
```bash
# Agregar origin en .env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

**¡Listo para desarrollar!** 🎉
