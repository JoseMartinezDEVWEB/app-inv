# 🖥️ Instrucciones para Probar Frontend Desktop con Backend SQLite

## ✅ Estado Actual

**Backend:** ✅ Configurado y listo  
**Frontend Desktop:** ✅ Configurado y listo  
**Credenciales:** ✅ Actualizadas

---

## 🔐 Credenciales de Acceso

```
Email:    admin@j4pro.com
Password: Jose.1919
```

---

## 🚀 Pasos para Ejecutar

### 1️⃣ Iniciar el Backend

Abre una terminal en `backend-sqlite`:

```bash
cd backend-sqlite
npm run dev
```

**Deberías ver:**
```
✅ Backend SQLite - Gestor de Inventario J4 Pro
🌐 Servidor:     http://localhost:4000
📡 API:          http://localhost:4000/api
🔌 WebSockets:   http://localhost:4000
```

**Deja esta terminal abierta** ✋

---

### 2️⃣ Iniciar el Frontend Desktop

Abre **OTRA terminal** en `frontend-desktop`:

```bash
cd frontend-desktop
npm run dev
```

**Deberías ver:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

Y luego Electron se abrirá automáticamente.

---

### 3️⃣ Hacer Login

En la ventana de Electron que se abre:

1. Ingresa las credenciales:
   - **Email:** `admin@j4pro.com`
   - **Password:** `Jose.1919`

2. Click en **"Iniciar Sesión"**

3. **Deberías ver:**
   - El dashboard principal
   - Menú lateral con opciones
   - Datos del usuario en la esquina

---

## 🧪 Verificaciones

### ✅ Backend está corriendo
```bash
# En otra terminal:
curl http://localhost:4000/api/salud
```

Debería responder:
```json
{
  "exito": true,
  "mensaje": "Operación exitosa",
  "datos": {
    "estado": "OK",
    "timestamp": "...",
    "uptime": ...
  }
}
```

### ✅ Login funciona desde consola
```bash
# Probar login directo
node backend-sqlite/test-api.js
```

Debería mostrar:
```
✅ Login exitoso
👤 Usuario: Administrador
🔑 Token generado
```

---

## 🔍 Verificar en la Consola del Frontend

1. Abre las **DevTools** en Electron (Ctrl+Shift+I o Cmd+Option+I)
2. Ve a la pestaña **Console**
3. Busca estos mensajes:

```
🔧 Detectando configuración de API...
   Entorno detectado: development
   URL de API seleccionada: http://localhost:4000/api
✅ Backend: 💻 Local/LAN
```

Si ves esto, **la configuración es correcta**.

---

## 🐛 Problemas Comunes

### ❌ Error: "Network Error" o "ERR_CONNECTION_REFUSED"

**Solución:** El backend no está corriendo
```bash
cd backend-sqlite
npm run dev
```

---

### ❌ Error: "Credenciales inválidas"

**Solución:** La contraseña no se actualizó correctamente
```bash
cd backend-sqlite
node update-admin-password.js
```

---

### ❌ Error de CORS

**Solución:** Verifica que el backend tenga `http://localhost:3000` en ALLOWED_ORIGINS

En `backend-sqlite/.env`, debe contener:
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8081
```

---

### ❌ El frontend no carga o muestra pantalla en blanco

**Solución:**
1. Detén el frontend (Ctrl+C)
2. Limpia el cache:
   ```bash
   cd frontend-desktop
   rm -rf node_modules/.vite
   npm run dev
   ```

---

## 📊 Qué Probar Después del Login

1. **📦 Clientes**
   - Deberías ver 2 clientes: "Supermercado El Ahorro" y "Tienda Don José"

2. **🏷️ Productos**
   - Deberías ver 10 productos generales
   - Arroz, Aceite, Azúcar, Frijoles, Coca Cola, etc.

3. **📋 Sesiones**
   - Lista vacía (no hay sesiones creadas aún)
   - Puedes crear una nueva sesión

4. **👥 Usuarios**
   - Deberías ver los usuarios existentes
   - Puedes crear nuevos usuarios

---

## 🎉 Éxito

Si ves el dashboard con datos de clientes y productos, **¡la conexión es exitosa!** 

El backend SQLite está 100% integrado con el frontend desktop.

---

## 📝 Notas

- **Backend:** Corre en puerto 4000
- **Frontend:** Corre en puerto 3000
- **WebSocket:** Mismo puerto que API (4000)
- **Base de datos:** `backend-sqlite/database/inventario.db`

---

## 🆘 Si Nada Funciona

1. Detén todo (Ctrl+C en ambas terminales)
2. Verifica el estado del backend:
   ```bash
   cd backend-sqlite
   npm run check
   ```
3. Reinicia el backend:
   ```bash
   npm run dev
   ```
4. Reinicia el frontend:
   ```bash
   cd frontend-desktop
   npm run dev
   ```

---

**¿Tienes problemas?** Revisa las consolas de ambas terminales para ver los errores específicos.
