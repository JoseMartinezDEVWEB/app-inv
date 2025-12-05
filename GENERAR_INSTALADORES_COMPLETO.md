# 🚀 Guía Completa - Generar Instaladores Desktop y Mobile

## 📋 **Resumen de Implementación**

He implementado **modo offline completo** en ambas aplicaciones:

### ✅ **Desktop (Electron) - Backend Embebido**
- Backend Node.js + SQLite integrado
- Inicia automáticamente al abrir la app
- Base de datos local en cada instalación
- Funciona sin internet

### ✅ **Mobile (React Native) - Base de Datos Local**
- SQLite integrado (expo-sqlite)
- Trabaja completamente offline
- Sincronización Bluetooth (BLE)
- Sincronización Internet (opcional)

---

## 🖥️ **PARTE 1: Generar Instalador Desktop**

### **Características**
- 🔹 Backend Node.js embebido
- 🔹 Base de datos SQLite local
- 🔹 Puerto dinámico (4000-4100)
- 🔹 Instalador profesional NSIS
- 🔹 **100% Offline**

### **Paso a Paso**

#### **1. Instalar Dependencias**

```bash
cd c:\Users\ASUS\Desktop\copia_app\frontend-desktop
npm install
```

#### **2. Generar Instalador**

```bash
# Instalador Windows (RECOMENDADO)
npm run build:win
```

**Proceso:**
1. ⏳ Empaqueta backend-sqlite (5 min)
2. ⏳ Compila frontend React (2 min)
3. ⏳ Crea instalador NSIS (3 min)
4. ✅ **Total: ~10 minutos**

#### **3. Ubicación del Instalador**

```
frontend-desktop/
  └── dist-installer/
      └── Gestor Inventario J4 Pro-Setup-1.0.0.exe  (~160 MB)
```

### **Otros Comandos**

```bash
# macOS
npm run build:mac

# Linux
npm run build:linux

# Solo empaquetar backend (testing)
npm run prebuild

# Build sin instalador (testing)
npm run pack
```

### **Distribución**

- ✅ Enviar el `.exe` a los usuarios
- ✅ Instalación simple: doble clic
- ✅ Funciona inmediatamente offline
- ✅ Credenciales: `admin@j4pro.com` / `Jose.1919`

---

## 📱 **PARTE 2: Generar APK Mobile**

### **Características**
- 🔹 SQLite local integrado
- 🔹 Modo colaborador offline
- 🔹 Sincronización Bluetooth
- 🔹 AsyncStorage para datos temporales
- 🔹 **Funciona sin internet**

### **Paso a Paso**

#### **1. Preparar Entorno**

```bash
cd c:\Users\ASUS\Desktop\copia_app\frontend-mobile
npm install

# Instalar EAS CLI (solo primera vez)
npm install -g eas-cli
```

#### **2. Login en Expo**

```bash
eas login
```

**Credenciales Expo:**
- Usuario: `jose_alberto19`
- Si necesitas crear cuenta: https://expo.dev/signup

#### **3. Verificar Configuración**

```bash
npm run build:check
```

Debe mostrar:
```
✅ Todo está correcto. Listo para generar la APK!
```

#### **4. Generar APK**

```bash
# Build en la nube (RECOMENDADO)
npm run build:preview
```

**Proceso:**
1. ⏳ EAS sube el código (2 min)
2. ⏳ Construye la APK en servidores Expo (15-20 min)
3. ✅ Proporciona enlace de descarga
4. ✅ **Total: ~20 minutos**

#### **5. Descargar APK**

- Clic en el enlace proporcionado
- O visitar: https://expo.dev/accounts/jose_alberto19/projects/gestor-inventario-j4-pro/builds
- Descargar el `.apk` (~55 MB)

### **Otros Comandos**

```bash
# Build producción
npm run build:production

# Ver historial
eas build:list

# Cancelar build
eas build:cancel

# Script con menú
build-apk.bat
```

### **Distribución**

- ✅ Compartir el `.apk` con usuarios
- ✅ Instalar en Android: Habilitar "Orígenes desconocidos"
- ✅ Funciona offline desde el inicio
- ✅ Credenciales: `admin@j4pro.com` / `Jose.1919`

---

## 🔧 **Arquitectura Técnica**

### **Desktop: Backend Embebido**

```
Instalador.exe
├── Frontend (React + Vite)
├── Electron
└── Backend (Node.js + SQLite)
    ├── Express Server
    ├── SQLite Database
    └── node_modules (producción)
```

**Flujo de inicio:**
```
Usuario abre app
  → Electron inicia
  → Backend embebido arranca (puerto 4000)
  → Frontend se conecta automáticamente
  → Usuario hace login
  → Todo funciona offline
```

### **Mobile: SQLite Local**

```
APK
├── React Native
├── Expo Runtime
└── Base de Datos (expo-sqlite)
    ├── SQLite integrado
    ├── AsyncStorage
    └── BLE para sincronización
```

**Flujo de trabajo colaborador:**
```
Usuario abre app
  → Hace login (requiere internet 1 vez)
  → Trabaja offline
  → Escanea productos → SQLite local
  → Sincroniza vía:
      • Bluetooth (sin internet)
      • API REST (con internet)
```

---

## 💾 **Ubicación de Datos**

### **Desktop**

Windows:
```
C:\Users\[Usuario]\AppData\Roaming\Gestor Inventario J4 Pro\
  └── backend\
      └── database\
          └── inventario.db
```

### **Mobile**

Android:
```
/data/data/com.j4pro.gestorinventario/
  ├── databases\
  │   └── SQLite.db
  └── files\
      └── AsyncStorage\
```

---

## 🔐 **Credenciales Iniciales**

Ambas aplicaciones usan las mismas credenciales:

- **Email:** `admin@j4pro.com`
- **Contraseña:** `Jose.1919`

---

## 📊 **Tamaños y Tiempos**

| Aplicación | Tamaño | Tiempo Build | Requiere |
|------------|--------|--------------|----------|
| **Desktop** | ~160 MB | 10 min | Node.js local |
| **Mobile** | ~55 MB | 20 min | Cuenta Expo |

---

## 🌐 **Modos de Operación**

### **Desktop**
- ✅ 100% Offline desde instalación
- ✅ Backend local automático
- ✅ Base de datos local
- ⚠️ Login requiere backend corriendo (local)

### **Mobile (Colaborador)**
- ✅ 100% Offline después del primer login
- ✅ Escanear y agregar productos sin internet
- ✅ Sincronización Bluetooth
- ⚠️ Primer login requiere internet

---

## 🐛 **Solución de Problemas**

### **Desktop**

❌ **"Backend no respondió"**
```
Causa: Node.js no está instalado en el sistema
Solución: El instalador debería incluir Node, pero verifica:
  node --version
```

❌ **"Puerto en uso"**
```
Causa: Puerto 4000 ocupado
Solución: La app busca automáticamente puertos 4000-4100
```

### **Mobile**

❌ **"App no instalada"**
```
Causa: Orígenes desconocidos deshabilitado
Solución: Configuración → Seguridad → Habilitar
```

❌ **"Bluetooth no funciona"**
```
Causa: Permisos de ubicación no otorgados
Solución: Configuración → App → Permisos → Ubicación
```

---

## 📋 **Checklist Pre-Distribución**

### **Antes de generar Desktop:**
- [ ] Backend funciona (`cd backend-sqlite && npm run dev`)
- [ ] Frontend funciona (`cd frontend-desktop && npm run dev`)
- [ ] Versión actualizada en package.json
- [ ] Icono actualizado (logo_transparent.png)

### **Antes de generar Mobile:**
- [ ] Configuración verificada (`npm run build:check`)
- [ ] Login en Expo (`eas whoami`)
- [ ] Versión actualizada en app.json
- [ ] Permisos configurados
- [ ] Icono actualizado (assets/icon.png)

---

## 🎯 **Comandos de Resumen Rápido**

### **Desktop**
```bash
cd frontend-desktop
npm install
npm run build:win
# Resultado: dist-installer/Gestor Inventario J4 Pro-Setup-1.0.0.exe
```

### **Mobile**
```bash
cd frontend-mobile
npm install
eas login
npm run build:preview
# Resultado: Enlace de descarga de APK
```

---

## 📦 **Distribución Final**

### **Desktop**
1. Subir `.exe` a Google Drive / OneDrive
2. Compartir enlace con usuarios
3. Los usuarios ejecutan el instalador
4. App funciona offline inmediatamente

### **Mobile**
1. Descargar `.apk` del enlace de Expo
2. Compartir APK con usuarios (Drive, Dropbox, etc.)
3. Los usuarios instalan desde "Orígenes desconocidos"
4. App funciona offline después del primer login

---

## 🔄 **Actualizaciones Futuras**

### **Desktop**
```bash
# 1. Actualizar version en package.json
# 2. Regenerar instalador
npm run build:win
# 3. Distribuir nuevo instalador
```

### **Mobile**
```bash
# 1. Actualizar version y versionCode en app.json
# 2. Regenerar APK
npm run build:preview
# 3. Descargar y distribuir nueva APK
```

---

## 📚 **Documentación Completa**

- **Desktop Detallado:** `INSTALADOR_DESKTOP_OFFLINE.md`
- **Mobile Detallado:** `APK_MOBILE_OFFLINE.md`
- **Build APK Rápido:** `QUICK_START_APK.txt`

---

## ✅ **Resumen de Funcionalidades Offline**

### **Usuario Colaborador (Mobile)**
✅ Escanear códigos QR/Barras
✅ Buscar productos en catálogo local
✅ Agregar productos manualmente
✅ Editar cantidades y costos
✅ Ver inventario local
✅ Sincronizar vía Bluetooth (sin internet)
✅ Sincronizar vía Internet (cuando disponible)

### **Usuario Administrador/Contable (Desktop + Mobile)**
✅ Todas las funciones del colaborador
✅ Crear y gestionar sesiones de inventario
✅ Gestionar clientes y productos
✅ Generar reportes PDF
✅ Ver dashboard con estadísticas
✅ Gestionar usuarios e invitaciones

---

## 🎉 **¡Todo Listo!**

Ahora puedes generar:
1. ✅ **Instalador Desktop** (100% offline con backend embebido)
2. ✅ **APK Mobile** (offline con sincronización flexible)

Ambas aplicaciones funcionan sin internet y con base de datos local.

---

## 📞 **Soporte**

Si encuentras problemas:
1. Revisa los logs en la consola
2. Verifica los requisitos (Node.js, Android SDK)
3. Consulta la documentación detallada
4. Revisa los archivos .md específicos de cada plataforma

---

**¡Éxito generando los instaladores! 🚀**
