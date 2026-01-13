# Implementación de Sincronización Bidireccional y Roles

## Resumen

Se ha implementado una arquitectura **Offline-First** completa que permite:
- Sincronización bidireccional entre clientes (Mobile/Desktop) y el servidor
- Jerarquía de roles (Admin, Contador, Colaborador) con filtrado por `business_id`
- Optimistic UI para una experiencia de usuario fluida sin bloqueos
- Cola de sincronización para operaciones pendientes

---

## 1. Backend (Node.js + SQLite)

### Nuevos Archivos
- `src/controllers/syncController.js` - Controlador de sincronización
- `src/routes/sync.js` - Rutas de sincronización
- `src/migrations/003_sync_fields.js` - Migración para nuevos campos

### Endpoints Creados

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/sync/batch` | POST | Recibe operaciones pendientes del cliente y las procesa con bulkWrite |
| `/api/sync/pull` | GET | Descarga cambios del servidor (filtrado por `updated_at`) |
| `/api/sync/status` | GET | Obtiene estado de sincronización del usuario |

### Campos Añadidos a los Modelos

```sql
-- Campos de sincronización
uuid TEXT UNIQUE          -- ID único generado por el frontend
business_id INTEGER       -- ID del Admin/Negocio principal
created_by INTEGER        -- Usuario que creó el registro
created_at INTEGER        -- Timestamp de creación
updated_at INTEGER        -- Timestamp de última actualización
```

### Jerarquía de Roles

```
Admin (business_id = propio ID)
  └── Contador (business_id = ID del Admin)
        └── Colaborador (business_id = ID del Admin)
```

---

## 2. Mobile (React Native)

### Archivos Modificados/Creados

- `src/services/SyncService.js` - Motor de sincronización Offline-First
- `src/services/localDb.js` - Base de datos SQLite local actualizada
- `src/screens/ClientesScreen.jsx` - Pantalla con Optimistic UI

### Flujo de Sincronización

```
1. Usuario crea/edita registro
   ↓
2. Se guarda en SQLite local (is_dirty = 1, sync_status = 'pending')
   ↓
3. UI se actualiza inmediatamente (Optimistic UI)
   ↓
4. SyncService envía cambios al servidor en segundo plano
   ↓
5. Si éxito: is_dirty = 0, sync_status = 'synced'
   Si falla: Se reintenta en próximo ciclo (cada 30s)
```

### Indicadores Visuales

- 🟢 Nube verde = Conectado y sincronizado
- 🟡 Nube amarilla parpadeante = Pendiente de sincronizar
- 🔴 Nube roja = Sin conexión

### Uso del SyncService

```javascript
import syncService from './services/SyncService'

// Inicializar
await syncService.initialize(userId, businessId)
syncService.start()

// Escuchar eventos
const unsubscribe = syncService.addListener((evento) => {
  if (evento.tipo === 'sync_success') {
    console.log('Sincronizado:', evento.count)
  }
})

// Forzar sincronización
await syncService.forceFullSync()

// Obtener estadísticas
const stats = await syncService.obtenerEstadisticas()
```

---

## 3. Desktop (Electron)

### Archivos Creados

- `src/services/SyncService.js` - Motor de sincronización con IndexedDB

### Almacenamiento Local

Usa **IndexedDB** con los siguientes stores:
- `clientes`
- `productos`
- `sesiones`
- `productos_contados`
- `sync_queue`
- `config`

---

## 4. Filtrado por business_id

### En el Backend

```javascript
// ClienteNegocio.js - buscarPorContador
let effectiveBusinessId = businessId
if (!effectiveBusinessId) {
  const usuario = db.prepare('SELECT contablePrincipalId FROM usuarios WHERE id = ?').get(contadorId)
  effectiveBusinessId = usuario?.contablePrincipalId || contadorId
}

// Filtro global
WHERE (cn.business_id = ? OR cn.contadorAsignadoId = ?)
```

### En el Frontend

```javascript
// Al obtener clientes
const clientes = await localDb.obtenerClientes(searchTerm, businessId)
```

---

## 5. Estructura de Sincronización

### Payload de PUSH

```json
{
  "changes": {
    "clientes": [
      {
        "_id": "uuid-local",
        "id_uuid": "uuid-local",
        "nombre": "Cliente X",
        "business_id": "admin-id",
        "is_dirty": 1,
        "deleted": 0
      }
    ],
    "productos": [...],
    "sesiones": [...]
  },
  "deviceId": "device-123",
  "timestamp": 1704844800000
}
```

### Respuesta del Servidor

```json
{
  "exito": true,
  "datos": {
    "processed": {
      "clientes": { "created": 2, "updated": 1, "deleted": 0 }
    },
    "serverTimestamp": 1704844900000
  }
}
```

---

## 6. Tablas SQLite Local (Mobile)

### Estructura de `clientes`

```sql
CREATE TABLE clientes(
    _id TEXT PRIMARY KEY,
    id_uuid TEXT UNIQUE,
    nombre TEXT NOT NULL,
    telefono TEXT,
    direccion TEXT,
    business_id TEXT,        -- ID del negocio
    created_by TEXT,         -- Usuario creador
    is_dirty INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'pending',
    last_updated INTEGER,
    deleted INTEGER DEFAULT 0
);
```

---

## 7. Uso en Sesiones de Inventario

### Selector de Clientes

El selector ahora consulta directamente SQLite local, filtrando por `business_id`:

```javascript
// En SesionModal.jsx o similar
const clientes = await localDb.obtenerClientes('', businessId)
```

### Pull de Actualizaciones

Al iniciar la app, se ejecuta `pullUpdates` para descargar cambios de otros colaboradores:

```javascript
// SyncService.js
async pullUpdates() {
  const response = await api.get('/sync/pull', {
    params: { lastSync: this.lastSyncTimestamp }
  })
  // Aplicar cambios a SQLite local
}
```

---

## 8. Notas de Implementación

### Optimistic UI
- **NO se bloquea la pantalla** con spinners al guardar
- El usuario ve el registro inmediatamente en la lista
- Un indicador discreto (nube) muestra el estado de sincronización

### Conflictos
- Si un registro local tiene `is_dirty = 1`, no se sobrescribe con datos del servidor
- El servidor tiene la última palabra (last-write-wins con preferencia servidor)

### Reintentos
- Operaciones fallidas se reintentan automáticamente cada 30 segundos
- Máximo 5 reintentos antes de marcar como error

---

## 9. Testing

### Probar Offline

1. Desactivar red/WiFi en el dispositivo
2. Crear un cliente
3. Verificar que aparece inmediatamente en la lista con indicador 🟡
4. Activar red
5. Verificar que el indicador cambia a sincronizado

### Probar Colaboradores

1. Iniciar sesión como Admin (crea `business_id`)
2. Crear colaborador con invitación
3. Iniciar sesión como Colaborador
4. Verificar que ve los clientes del Admin (filtrado por `business_id`)

---

## 10. Archivos Modificados

### Backend
- `src/controllers/clientesController.js`
- `src/controllers/syncController.js` (nuevo)
- `src/models/ClienteNegocio.js`
- `src/routes/sync.js` (nuevo)
- `src/migrations/003_sync_fields.js` (nuevo)
- `src/migrations/runMigrations.js`
- `src/server.js`

### Mobile
- `src/services/SyncService.js`
- `src/services/localDb.js`
- `src/screens/ClientesScreen.jsx`

### Desktop
- `src/services/SyncService.js` (nuevo)
- `src/services/api.js`


