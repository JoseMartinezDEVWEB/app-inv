# 📱 Generar APK Mobile - Modo Offline Completo

## 🎯 **Características de la App Mobile**

✅ **Base de Datos Local (expo-sqlite)**
- SQLite integrado en la app
- Funciona completamente offline
- AsyncStorage para preferencias y datos temporales
- Sincronización Bluetooth (BLE) para transferir datos sin internet

✅ **Funcionalidades del Colaborador**
- ✅ Escanear códigos QR/Barras
- ✅ Buscar productos en catálogo local
- ✅ Agregar productos manualmente
- ✅ Trabajar completamente offline
- ✅ Sincronización vía Bluetooth
- ✅ Sincronización vía Internet (cuando disponible)

✅ **Sincronización Flexible**
- **Sin Internet:** Bluetooth (BLE) entre dispositivos
- **Con Internet:** API REST al backend
- **Híbrido:** Trabaja offline y sincroniza después

---

## 🚀 **Generar la APK**

### **Método 1: Build en la Nube (EAS) - RECOMENDADO**

```bash
# 1. Navegar al proyecto
cd frontend-mobile

# 2. Login en Expo (solo primera vez)
eas login

# 3. Generar APK
npm run build:preview
```

**Resultado:**
- APK lista en 10-20 minutos
- Descarga desde el enlace proporcionado
- APK standalone lista para instalar

---

### **Método 2: Build Local (Requiere Android Studio)**

```bash
cd frontend-mobile

# Configurar Android SDK
npm run build:local
```

⚠️ **Requiere:**
- Android Studio instalado
- Android SDK configurado
- Más complejo pero sin dependencia de servidores

---

### **Método 3: Usando el Script Helper**

```bash
cd frontend-mobile
build-apk.bat
```

Selecciona opción 1 (Preview)

---

## 📦 **Perfiles de Build Disponibles**

| Perfil | Conectividad | Uso |
|--------|-------------|-----|
| `preview` | Internet cuando disponible | **RECOMENDADO** - Funciona offline |
| `local-test` | Solo local | Para desarrollo |
| `production` | Optimizado | Para distribución |

---

## 💾 **Almacenamiento de Datos**

La APK guarda datos en:

```
/data/data/com.j4pro.gestorinventario/
  ├── databases/
  │   └── SQLite.db              (Base de datos principal)
  ├── files/
  │   └── AsyncStorage/          (Preferencias y datos offline)
  └── cache/                     (Caché temporal)
```

---

## 🔄 **Flujo de Trabajo Offline del Colaborador**

### **Escenario 1: Sin Internet**

1. **Abrir app** → Funciona sin conexión
2. **Escanear productos** → Guarda en SQLite local
3. **Sincronizar** → Bluetooth con dispositivo principal

```
Colaborador (Offline)
    ↓ Escanea productos
    ↓ Guarda en SQLite
    ↓ 
    📡 Bluetooth → Dispositivo Principal
```

### **Escenario 2: Con Internet**

1. **Trabajar offline** → Datos en SQLite local
2. **Internet disponible** → Sincroniza automáticamente
3. **Backend recibe** → Consolida en servidor

```
Colaborador (Offline)
    ↓ Trabaja sin internet
    ↓ Guarda localmente
    ↓ Internet disponible
    📡 API REST → Backend
```

---

## 🔧 **Configuración de Build**

### **app.json - Permisos**

```json
{
  "android": {
    "permissions": [
      "INTERNET",              // Sincronización
      "CAMERA",                // Escanear QR
      "BLUETOOTH",             // Sincronización BLE
      "ACCESS_NETWORK_STATE"   // Detectar conectividad
    ]
  }
}
```

### **eas.json - Perfiles**

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "http://localhost:4000/api"
      }
    }
  }
}
```

---

## 📱 **Instalación de la APK**

### **Paso 1: Descargar**
- Del enlace que proporciona EAS Build
- O del repositorio compartido

### **Paso 2: Habilitar Instalación**
```
Configuración → Seguridad → Orígenes desconocidos
```

### **Paso 3: Instalar**
- Abrir archivo `.apk`
- Seguir instrucciones

### **Paso 4: Primer Uso**
- **Login:** `admin@j4pro.com`
- **Contraseña:** `Jose.1919`

---

## 🌐 **Modos de Operación**

### **100% Offline (Colaborador)**

✅ Escanear productos
✅ Agregar manualmente
✅ Editar cantidades
✅ Ver inventario local
✅ Sincronizar vía Bluetooth

❌ Login inicial (requiere internet una vez)
❌ Actualizar catálogo de productos

### **Híbrido (Contable/Administrador)**

✅ Todo lo del colaborador
✅ Crear sesiones de inventario
✅ Gestionar clientes
✅ Generar reportes PDF
✅ Sincronización en tiempo real

---

## 🔌 **Sincronización Bluetooth (BLE)**

### **Cómo Funciona**

1. **Colaborador** trabaja offline y guarda productos
2. **Principal** abre "Recibir por Bluetooth"
3. **Colaborador** selecciona "Sincronizar vía Bluetooth"
4. **Transferencia** automática sin internet
5. **Consolidación** en el dispositivo principal

### **Ventajas**
- ⚡ Rápido (10-100 metros de alcance)
- 🔒 Seguro (conexión directa)
- 🌐 Sin necesidad de internet
- 📦 Transfiere múltiples productos

---

## 📊 **Tamaño de la APK**

| Componente | Tamaño |
|------------|--------|
| React Native | ~25 MB |
| Expo Runtime | ~15 MB |
| Dependencias | ~10 MB |
| Assets | ~5 MB |
| **Total** | **~55 MB** |

---

## 🐛 **Solución de Problemas**

### APK no instala
```
Error: "App not installed"
```
**Solución:** Habilitar "Instalar desde fuentes desconocidas"

### Bluetooth no funciona
```
Error: "BLE no disponible"
```
**Solución:** 
- Activar Bluetooth en ambos dispositivos
- Dar permisos de ubicación (requerido para BLE)

### No sincroniza offline
**Solución:**
- Los datos se guardan localmente en SQLite
- Sincroniza cuando haya internet o vía Bluetooth

---

## 🔄 **Actualización de la APK**

Para nueva versión:

1. Incrementar `version` en `app.json`
2. Incrementar `versionCode` en `android` section
3. Ejecutar `npm run build:preview`
4. Distribuir nueva APK

Los datos del usuario se mantienen al actualizar.

---

## 📋 **Checklist Pre-Build**

- [ ] Permisos configurados en `app.json`
- [ ] Versión actualizada
- [ ] Iconos actualizados (`assets/icon.png`)
- [ ] Splash screen configurado
- [ ] URLs del backend configuradas (opcional si 100% offline)
- [ ] Credenciales de prueba documentadas

---

## 🎉 **Resultado Final**

Una APK única que:
- ✅ Funciona sin internet (modo colaborador)
- ✅ Base de datos local (SQLite)
- ✅ Sincronización Bluetooth
- ✅ Sincronización Internet (opcional)
- ✅ Lista para distribución

**El colaborador puede trabajar completamente offline y sincronizar después.**

---

## 📞 **Comandos Rápidos**

```bash
# Verificar configuración
npm run build:check

# Build APK (EAS Cloud)
npm run build:preview

# Build producción
npm run build:production

# Ver historial de builds
eas build:list

# Cancelar build en progreso
eas build:cancel
```

---

## 🔗 **Recursos**

- **Estado de builds:** https://expo.dev/accounts/jose_alberto19/projects/gestor-inventario-j4-pro/builds
- **Documentación EAS Build:** https://docs.expo.dev/build/introduction/
- **Expo SQLite:** https://docs.expo.dev/versions/latest/sdk/sqlite/
- **React Native BLE:** https://github.com/dotintent/react-native-ble-plx

---

**¡Listo para generar la APK! 🚀**

## 💡 **Tip: Distribución**

Para distribuir la APK:
1. Súbela a Google Drive / Dropbox
2. Comparte el enlace con los usuarios
3. O usa herramientas como Firebase App Distribution

No necesitas publicar en Play Store para uso interno.
