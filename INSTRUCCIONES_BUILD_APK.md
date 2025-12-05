# 📱 Instrucciones para Generar APK - Gestor de Inventario J4 Pro Mobile

## 🎯 Configuración Completada

Ya he actualizado la configuración del proyecto para apuntar al backend local en el puerto **4000**.

---

## 📋 **Requisitos Previos**

1. **Node.js y npm** instalados
2. **Cuenta de Expo** (gratuita)
3. **EAS CLI** instalado globalmente

---

## ⚙️ **Instalación de EAS CLI**

Si no tienes EAS CLI instalado, ejecuta:

```bash
npm install -g eas-cli
```

---

## 🔐 **Login en Expo**

Inicia sesión en tu cuenta de Expo:

```bash
eas login
```

Si no tienes cuenta, créala en: https://expo.dev/signup

---

## 🚀 **Opciones para Generar la APK**

### **Opción 1: Build en la Nube (RECOMENDADO para pruebas)**

Esta es la forma más fácil y rápida. Expo construye la APK en sus servidores.

```bash
cd frontend-mobile
npm run build:preview
```

**Proceso:**
1. EAS Build subirá tu código a los servidores de Expo
2. Construirá la APK (tarda 10-20 minutos)
3. Te dará un enlace para descargar la APK cuando esté lista
4. Descarga e instala en tu dispositivo Android

**URL de la APK:** 
- Se conectará a: `https://appj4-hlqj.onrender.com/api` (backend en la nube)

---

### **Opción 2: Build Local**

Si prefieres construir localmente (requiere más configuración):

```bash
cd frontend-mobile
npm run build:local
```

⚠️ **Nota:** Requiere Docker instalado y configurado.

---

### **Opción 3: Build para Producción**

Para una versión optimizada de producción:

```bash
cd frontend-mobile
npm run build:production
```

---

## 📱 **Perfiles de Build Disponibles**

| Perfil | API URL | Uso |
|--------|---------|-----|
| `preview` | `https://appj4-hlqj.onrender.com/api` | **RECOMENDADO** - Pruebas con backend en la nube |
| `local-test` | `http://localhost:4000/api` | Pruebas con backend local (solo WiFi) |
| `development` | `http://10.0.0.41:4000/api` | Desarrollo con IP LAN específica |
| `production` | `https://appj4-hlqj.onrender.com/api` | Versión de producción |

---

## 🔄 **Proceso Paso a Paso (Build Preview - RECOMENDADO)**

### 1. Navegar al proyecto mobile
```bash
cd c:\Users\ASUS\Desktop\copia_app\frontend-mobile
```

### 2. Instalar dependencias (si no lo has hecho)
```bash
npm install
```

### 3. Iniciar sesión en Expo
```bash
eas login
```

### 4. Generar la APK
```bash
npm run build:preview
```

### 5. Esperar la construcción
- Verás el progreso en la terminal
- También puedes ver el estado en: https://expo.dev/accounts/[tu-usuario]/projects/gestor-inventario-j4-pro/builds

### 6. Descargar la APK
- Cuando termine, recibirás un enlace de descarga
- Descarga el archivo `.apk` en tu computadora

### 7. Instalar en Android
- Transfiere la APK a tu dispositivo Android
- Habilita "Instalar desde fuentes desconocidas" en configuración
- Abre la APK y sigue las instrucciones de instalación

---

## 🌐 **Para Probar con Backend Local**

Si quieres que la APK se conecte a tu backend local (localhost:4000):

### **Método 1: Usar IP de LAN**

1. Encuentra tu IP local:
   ```bash
   ipconfig
   # Busca IPv4 Address (ej: 192.168.1.100)
   ```

2. Modifica `eas.json` línea 15:
   ```json
   "EXPO_PUBLIC_API_URL": "http://TU_IP_LOCAL:4000/api"
   ```

3. Asegúrate de que tu dispositivo Android esté en la misma red WiFi

4. Construye la APK:
   ```bash
   npm run build:preview
   ```

### **Método 2: Usar ngrok (Túnel HTTP)**

Si no puedes conectarte por LAN:

1. Instala ngrok: https://ngrok.com/download

2. Inicia el túnel:
   ```bash
   ngrok http 4000
   ```

3. Ngrok te dará una URL pública (ej: `https://abc123.ngrok.io`)

4. Modifica `eas.json`:
   ```json
   "EXPO_PUBLIC_API_URL": "https://abc123.ngrok.io/api"
   ```

5. Construye la APK

---

## 🔥 **Comandos Rápidos**

| Comando | Descripción |
|---------|-------------|
| `npm run build:preview` | Build para pruebas (nube) - **RECOMENDADO** |
| `npm run build:production` | Build de producción |
| `npm run build:local` | Build local (requiere Docker) |
| `eas build:list` | Ver historial de builds |
| `eas build:cancel` | Cancelar build en progreso |

---

## 📦 **Credenciales de Prueba**

Una vez instalada la APK, usa estas credenciales para hacer login:

- **Email:** `admin@j4pro.com`
- **Contraseña:** `Jose.1919`

---

## ⚠️ **Solución de Problemas**

### Error: "Not logged in"
```bash
eas login
```

### Error: "Project not configured"
```bash
eas build:configure
```

### Error: "Build failed"
- Verifica que `app.json` tenga todos los campos requeridos
- Revisa los logs del build en la web de Expo

### La APK no se conecta al backend
- Verifica que la URL del backend sea accesible desde el dispositivo
- Si usas IP local, asegúrate de estar en la misma red WiFi
- Verifica que el backend esté corriendo en el puerto 4000

---

## 📊 **Estado del Build**

Para ver el estado de tus builds:

1. Web: https://expo.dev/accounts/jose_alberto19/projects/gestor-inventario-j4-pro/builds
2. CLI: `eas build:list`

---

## 🎉 **Resumen Rápido**

Para generar la APK de manera más fácil:

```bash
# 1. Ir al proyecto
cd c:\Users\ASUS\Desktop\copia_app\frontend-mobile

# 2. Login en Expo
eas login

# 3. Generar APK (10-20 min)
npm run build:preview

# 4. Descargar del enlace que te proporciona
# 5. Instalar en tu Android
# 6. Login con admin@j4pro.com / Jose.1919
```

---

## 📝 **Notas Importantes**

- ✅ El backend está configurado en el puerto **4000**
- ✅ La configuración de `eas.json` ya está actualizada
- ✅ Los permisos de Android están configurados (cámara, Bluetooth, etc.)
- ✅ El build **preview** se conectará al backend en la nube por defecto
- 📱 Para pruebas locales, usa la IP de tu LAN o ngrok
- 🔒 Asegúrate de que el backend esté corriendo antes de probar la app

---

## 🆘 **Ayuda Adicional**

- Documentación EAS Build: https://docs.expo.dev/build/introduction/
- Foro de Expo: https://forums.expo.dev/
- Discord de Expo: https://chat.expo.dev/

---

**¡Listo para generar tu APK! 🚀**
