# 🖥️ Generador de Instalador Desktop - Modo Offline Completo

## 🎯 **Características Implementadas**

✅ **Backend Local Embebido**
- Node.js + SQLite integrado en la aplicación
- Inicia automáticamente al abrir la app
- Puerto dinámico (4000-4100)
- Base de datos local en cada instalación

✅ **Funciona Sin Internet**
- Backend y frontend en un solo instalador
- Base de datos SQLite local
- No requiere conexión a servidores externos
- Datos almacenados localmente en la computadora

✅ **Instalador Profesional**
- NSIS para Windows (Setup.exe)
- DMG para macOS
- AppImage/DEB para Linux
- Creación automática de accesos directos
- Desinstalador incluido

---

## 🚀 **Generar el Instalador**

### **Paso 1: Instalar Dependencias**

```bash
cd frontend-desktop
npm install
```

### **Paso 2: Generar Instalador para Windows**

```bash
npm run build:win
```

**Proceso:**
1. ⏳ Empaqueta el backend SQLite
2. ⏳ Compila el frontend React
3. ⏳ Crea el instalador NSIS
4. ✅ Resultado: `dist-installer/Gestor Inventario J4 Pro-Setup-1.0.0.exe`

**Tiempo estimado:** 5-10 minutos

---

### **Otras Plataformas**

```bash
# macOS
npm run build:mac

# Linux
npm run build:linux

# Todas las plataformas
npm run dist
```

---

## 📦 **Ubicación del Instalador**

Después del build, encontrarás el instalador en:

```
frontend-desktop/
  └── dist-installer/
      └── Gestor Inventario J4 Pro-Setup-1.0.0.exe  (Windows)
      └── Gestor Inventario J4 Pro-1.0.0.dmg         (macOS)
      └── Gestor Inventario J4 Pro-1.0.0.AppImage    (Linux)
```

---

## 💾 **Ubicación de Datos del Usuario**

Una vez instalada, la aplicación guardará los datos en:

### Windows:
```
C:\Users\[Usuario]\AppData\Roaming\Gestor Inventario J4 Pro\
  ├── backend/
  │   ├── database/
  │   │   └── inventario.db  (Base de datos principal)
  │   └── logs/              (Logs del backend)
  └── ...
```

### macOS:
```
~/Library/Application Support/Gestor Inventario J4 Pro/
```

### Linux:
```
~/.config/Gestor Inventario J4 Pro/
```

---

## 🔧 **Proceso Técnico Detallado**

### **1. Script package-backend.js**

Empaqueta el backend con:
- ✅ Código fuente completo (`src/`)
- ✅ Dependencias de producción (node_modules/)
- ✅ Variables de entorno (.env)
- ✅ Estructura de carpetas (database/, logs/)

### **2. Backend Embebido (backend-server.js)**

Al iniciar la aplicación:
1. Busca un puerto disponible (4000-4100)
2. Inicia el servidor Node.js con SQLite
3. Espera a que esté listo (health check)
4. Frontend se conecta automáticamente

### **3. Electron Main Process**

```javascript
// Flujo de inicio:
app.whenReady() 
  → backendServer.start()
  → createWindow()
  → Frontend conecta a backend local
```

---

## 🔐 **Credenciales por Defecto**

La primera vez que se ejecuta, se crea el usuario admin:

- **Email:** `admin@j4pro.com`
- **Contraseña:** `Jose.1919`

---

## 🌐 **Modo de Operación**

### **100% Offline**
- ✅ Backend local (localhost)
- ✅ Base de datos SQLite
- ✅ No requiere internet
- ✅ Sin dependencias externas

### **Opcional: Sincronización**
Si el usuario quiere sincronizar con otros dispositivos:
- Puede configurar un backend remoto manualmente
- Los datos locales se mantienen como respaldo

---

## ⚙️ **Configuración de Build**

### **electron-builder.json**

```json
{
  "appId": "com.j4pro.gestor-inventario-desktop",
  "productName": "Gestor Inventario J4 Pro",
  "extraResources": [
    {
      "from": "resources/backend",
      "to": "backend"
    }
  ],
  "win": {
    "target": "nsis"
  }
}
```

---

## 🐛 **Solución de Problemas**

### Error: "Backend no respondió"
```bash
# Verificar que Node.js esté instalado en el sistema
node --version

# El instalador incluye Node pero verifica las dependencias
```

### Error: "Puerto en uso"
La app detecta automáticamente un puerto libre (4000-4100)

### Base de datos corrupta
```bash
# Ubicación de backup automático:
AppData/Roaming/Gestor Inventario J4 Pro/backend/database/backups/
```

---

## 📊 **Tamaño del Instalador**

| Componente | Tamaño |
|------------|--------|
| Frontend (React) | ~10 MB |
| Backend (Node.js) | ~30 MB |
| Electron | ~120 MB |
| **Total** | **~160 MB** |

---

## 🔄 **Actualización de la App**

Para crear una nueva versión:

1. Actualizar `version` en `package.json`
2. Ejecutar `npm run build:win`
3. Distribuir el nuevo instalador

El instalador detectará la versión anterior y actualizará sin perder datos.

---

## 📋 **Checklist de Build**

Antes de generar el instalador:

- [ ] Backend funciona correctamente (`npm run dev` en backend-sqlite)
- [ ] Frontend funciona correctamente (`npm run dev` en frontend-desktop)
- [ ] Credenciales admin configuradas
- [ ] Variables de entorno configuradas (.env.example)
- [ ] Iconos actualizados (logo_transparent.png)
- [ ] Versión actualizada en package.json

---

## 🎉 **Resultado Final**

Un instalador único que incluye:
- ✅ Aplicación de escritorio profesional
- ✅ Backend Node.js + Express
- ✅ Base de datos SQLite
- ✅ Funciona sin internet
- ✅ Instalación en un clic
- ✅ Desinstalador incluido

**El usuario solo descarga e instala. Todo funciona automáticamente offline.**

---

## 📞 **Comandos Rápidos**

```bash
# Desarrollo
npm run dev                 # Modo desarrollo

# Producción
npm run build:win           # Instalador Windows
npm run build:mac           # Instalador macOS  
npm run build:linux         # Instalador Linux
npm run dist                # Todas las plataformas

# Utilidades
npm run prebuild            # Solo empaquetar backend
npm run pack                # Build sin instalador (para testing)
```

---

**¡Listo para generar el instalador! 🚀**
