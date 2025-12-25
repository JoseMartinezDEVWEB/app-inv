@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   CREAR INSTALADOR EJECUTABLE
echo   Gestor de Inventario J4 Pro
echo ========================================
echo.

:: Verificar que estamos en la carpeta correcta
if not exist "frontend-desktop\package.json" (
    echo ❌ Error: Este script debe ejecutarse desde la carpeta raíz del proyecto
    pause
    exit /b 1
)

:: Verificar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js no está instalado
    pause
    exit /b 1
)

echo ✅ Verificando instalación...
echo.

:: Verificar que las dependencias estén instaladas
if not exist "backend-sqlite\node_modules" (
    echo ⚠️  Dependencias del backend no instaladas. Instalando...
    cd backend-sqlite
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Error al instalar dependencias del backend
        pause
        exit /b 1
    )
    cd ..
)

if not exist "frontend-desktop\node_modules" (
    echo ⚠️  Dependencias del frontend no instaladas. Instalando...
    cd frontend-desktop
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Error al instalar dependencias del frontend
        pause
        exit /b 1
    )
    cd ..
)

echo.
echo ========================================
echo   EMPAQUETANDO APLICACIÓN
echo ========================================
echo.

cd frontend-desktop

echo 📦 Empaquetando backend...
call npm run prebuild
if %errorlevel% neq 0 (
    echo ❌ Error al empaquetar backend
    pause
    exit /b 1
)

echo.
echo 📦 Compilando frontend...
call npm run build:react
if %errorlevel% neq 0 (
    echo ❌ Error al compilar frontend
    pause
    exit /b 1
)

echo.
echo 📦 Creando instalador...
echo    Esto puede tardar varios minutos...
echo.

call npm run build:installer
if %errorlevel% neq 0 (
    echo ❌ Error al crear instalador
    pause
    exit /b 1
)

cd ..

echo.
echo ========================================
echo   INSTALADOR CREADO EXITOSAMENTE
echo ========================================
echo.
echo ✅ El instalador se encuentra en:
echo    frontend-desktop\dist-installer\
echo.
echo 📋 Archivos generados:
dir /b frontend-desktop\dist-installer\
echo.
echo 🚀 Puedes distribuir el archivo .exe a otros usuarios
echo.
pause





