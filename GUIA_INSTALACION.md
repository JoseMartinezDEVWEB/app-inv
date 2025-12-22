# 📦 Guía de Instalación - Gestor de Inventario J4 Pro Desktop

Esta guía te ayudará a instalar y configurar la aplicación **Gestor de Inventario J4 Pro** en tu computadora.

---

## 📋 Requisitos del Sistema

### Requisitos Mínimos

- **Sistema Operativo**: Windows 10/11, macOS 10.15+, o Linux (Ubuntu 20.04+)
- **Node.js**: Versión 18.x o superior
- **npm**: Versión 9.x o superior (viene con Node.js)
- **Python**: Versión 3.8+ (opcional, solo para importación de productos con IA)
- **Espacio en disco**: Mínimo 500 MB libres
- **RAM**: Mínimo 4 GB

### Software Necesario

1. **Node.js**: [Descargar desde nodejs.org](https://nodejs.org/)
   - Recomendado: Versión LTS (Long Term Support)
   - Durante la instalación, asegúrate de marcar la opción "Add to PATH"

2. **Python** (Opcional): [Descargar desde python.org](https://www.python.org/downloads/)
   - Necesario solo si quieres usar la función de importación de productos con IA
   - Durante la instalación, marca "Add Python to PATH"

---

## 🚀 Instalación Automática (Recomendado)

### Windows

1. **Descarga el instalador automático**:
   - Ejecuta el archivo `instalador.bat` que viene con la aplicación
   - Haz doble clic en `instalador.bat`

2. **El script hará automáticamente**:
   - ✅ Verificación de Node.js y npm
   - ✅ Instalación de dependencias del backend
   - ✅ Instalación de dependencias del frontend
   - ✅ Creación de directorios necesarios
   - ✅ Configuración de la base de datos
   - ✅ Ejecución de migraciones

3. **Sigue las instrucciones en pantalla**

### macOS / Linux

```bash
# Dar permisos de ejecución
chmod +x instalador.sh

# Ejecutar instalador
./instalador.sh
```

---

## 📝 Instalación Manual

Si prefieres instalar manualmente o el instalador automático no funciona, sigue estos pasos:

### Paso 1: Verificar Node.js

Abre una terminal (PowerShell en Windows, Terminal en macOS/Linux) y ejecuta:

```bash
node --version
npm --version
```

Deberías ver algo como:
```
v18.17.0
9.6.7
```

Si no tienes Node.js instalado, descárgalo desde [nodejs.org](https://nodejs.org/)

### Paso 2: Instalar Backend

1. Abre una terminal en la carpeta raíz del proyecto
2. Navega a la carpeta del backend:

```bash
cd backend-sqlite
```

3. Instala las dependencias:

```bash
npm install
```

4. Crea el archivo de configuración `.env`:

```bash
# Si existe .env.example, cópialo
copy .env.example .env    # Windows
# o
cp .env.example .env       # macOS/Linux
```

5. Crea los directorios necesarios:

```bash
# Windows
mkdir database
mkdir database\backups
mkdir logs
mkdir temp

# macOS/Linux
mkdir -p database/backups
mkdir logs
mkdir temp
```

6. Ejecuta las migraciones para crear la base de datos:

```bash
npm run migrate
```

7. (Opcional) Ejecuta los datos de prueba:

```bash
npm run seed
```

### Paso 3: Instalar Frontend Desktop

1. Abre una nueva terminal en la carpeta raíz del proyecto
2. Navega a la carpeta del frontend:

```bash
cd frontend-desktop
```

3. Instala las dependencias:

```bash
npm install
```

### Paso 4: Verificar la Instalación

1. **Inicia el backend** (en una terminal):

```bash
cd backend-sqlite
npm start
```

Deberías ver:
```
✅ Conexión a SQLite establecida
🚀 Servidor corriendo en http://localhost:4000
```

2. **Inicia el frontend** (en otra terminal):

```bash
cd frontend-desktop
npm run dev
```

3. La aplicación debería abrirse automáticamente en una ventana de Electron

---

## 🔧 Configuración Adicional

### Configurar Variables de Entorno

Edita el archivo `backend-sqlite/.env` con tus preferencias:

```env
# Puerto del servidor
PORT=4000

# Base de datos
DATABASE_PATH=./database/inventario.db
DATABASE_BACKUP_PATH=./database/backups

# JWT (cambiar en producción)
JWT_SECRET=tu_secreto_super_seguro_aqui
JWT_REFRESH_SECRET=tu_refresh_secreto_aqui

# Entorno
NODE_ENV=development
```

### Configurar Python para Importación de Productos

Si quieres usar la función de importación de productos con IA:

1. Instala Python 3.8 o superior
2. Instala las dependencias de Python:

```bash
cd backend-sqlite
pip install -r requirements.txt
```

Las dependencias incluyen:
- `pandas` - Para leer archivos Excel
- `openpyxl` - Soporte para Excel
- `PyPDF2` y `pdfplumber` - Para leer PDFs
- `google-generativeai` - Para procesamiento con IA

---

## 📦 Crear Instalador Ejecutable

Para crear un instalador ejecutable (.exe en Windows, .dmg en macOS, .AppImage en Linux):

### Windows

**Opción 1: Script automático (Recomendado)**
```bash
crear-instalador.bat
```

**Opción 2: Manual**
```bash
cd frontend-desktop
npm run build:win
```

El instalador se creará en: `frontend-desktop/dist-installer/`

**Nota**: El instalador incluirá el icono de la aplicación (`logo_transparent-1UMhnOlZ.png`)

### macOS

```bash
cd frontend-desktop
npm run build:mac
```

### Linux

```bash
cd frontend-desktop
npm run build:linux
```

---

## 🚀 Iniciar la Aplicación

### Modo Desarrollo

**Opción 1: Iniciar por separado**

1. Terminal 1 - Backend:
```bash
cd backend-sqlite
npm start
```

2. Terminal 2 - Frontend:
```bash
cd frontend-desktop
npm run dev
```

**Opción 2: Iniciar todo junto (solo frontend)**

```bash
cd frontend-desktop
npm run dev
```

Esto iniciará automáticamente el backend embebido.

### Modo Producción (Instalador)

1. Ejecuta el instalador creado (`Gestor-Inventario-J4-Pro-Setup-x.x.x.exe`)
2. Sigue el asistente de instalación
3. La aplicación se instalará y podrás ejecutarla desde el menú de inicio

---

## 🔍 Solución de Problemas

### Error: "Node.js no está instalado"

**Solución**: Instala Node.js desde [nodejs.org](https://nodejs.org/)

### Error: "npm no se reconoce como comando"

**Solución**: 
1. Reinstala Node.js
2. Asegúrate de marcar "Add to PATH" durante la instalación
3. Reinicia la terminal

### Error: "Cannot find module"

**Solución**: 
```bash
# Elimina node_modules y reinstala
rm -rf node_modules    # macOS/Linux
rmdir /s node_modules  # Windows

npm install
```

### Error: "Port 4000 already in use"

**Solución**: 
1. Cambia el puerto en `backend-sqlite/.env`:
   ```env
   PORT=4001
   ```
2. O cierra la aplicación que está usando el puerto 4000

### Error: "Database locked"

**Solución**: 
1. Cierra todas las instancias de la aplicación
2. Espera unos segundos
3. Vuelve a iniciar

### Error al importar productos (Python)

**Solución**:
1. Verifica que Python esté instalado: `python --version`
2. Verifica que esté en el PATH
3. Instala las dependencias: `pip install -r requirements.txt`

---

## 📁 Estructura de Carpetas Después de la Instalación

```
copia_app/
├── backend-sqlite/
│   ├── database/
│   │   ├── inventario.db          # Base de datos SQLite
│   │   └── backups/               # Backups automáticos
│   ├── logs/                      # Logs de la aplicación
│   ├── temp/                      # Archivos temporales
│   ├── node_modules/             # Dependencias del backend
│   ├── src/                       # Código fuente
│   └── .env                       # Configuración
│
└── frontend-desktop/
    ├── dist/                      # Build de producción
    ├── dist-installer/            # Instaladores generados
    ├── node_modules/              # Dependencias del frontend
    ├── resources/
    │   └── backend/               # Backend empaquetado
    └── src/                       # Código fuente
```

---

## 🔐 Credenciales por Defecto

Si ejecutaste los seeds, puedes iniciar sesión con:

- **Email**: `admin@j4pro.com`
- **Password**: `admin123`
- **Rol**: Administrador

**⚠️ IMPORTANTE**: Cambia estas credenciales en producción.

---

## 📞 Soporte

Si tienes problemas con la instalación:

1. Revisa la sección "Solución de Problemas" arriba
2. Verifica que todos los requisitos estén instalados
3. Revisa los logs en `backend-sqlite/logs/`
4. Contacta al equipo de soporte

---

## ✅ Verificación Final

Para verificar que todo está instalado correctamente:

1. ✅ Node.js instalado: `node --version`
2. ✅ npm instalado: `npm --version`
3. ✅ Backend funciona: `cd backend-sqlite && npm start`
4. ✅ Frontend funciona: `cd frontend-desktop && npm run dev`
5. ✅ Base de datos creada: Verifica `backend-sqlite/database/inventario.db`

---

## 🎉 ¡Listo!

Si llegaste hasta aquí, la aplicación está instalada y lista para usar. 

**Próximos pasos**:
1. Inicia sesión con las credenciales por defecto
2. Explora las funcionalidades
3. Crea tus primeros clientes y productos
4. ¡Comienza a gestionar tus inventarios!

---

**Versión**: 1.0.0  
**Última actualización**: 2025  
**Desarrollado por**: J4 Pro

