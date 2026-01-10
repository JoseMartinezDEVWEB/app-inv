@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   INSTALADOR - GESTOR DE INVENTARIO
echo   J4 Pro Desktop Application
echo ========================================
echo.

:: Colores (si está disponible)
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "RESET=[0m"

:: Verificar si Node.js está instalado
echo %BLUE%Verificando requisitos del sistema...%RESET%
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%[ERROR] Node.js no esta instalado.%RESET%
    echo.
    echo Por favor, instala Node.js desde: https://nodejs.org/
    echo Versión mínima requerida: Node.js 18.x o superior
    echo.
    pause
    exit /b 1
)

:: Verificar versión de Node.js
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo %GREEN%[OK] Node.js encontrado: %NODE_VERSION%%RESET%

:: Verificar npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%[ERROR] npm no esta instalado.%RESET%
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo %GREEN%[OK] npm encontrado: %NPM_VERSION%%RESET%

:: Verificar Python (para importación de productos)
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%[ADVERTENCIA] Python no esta instalado. La funcion de importacion de productos puede no funcionar.%RESET%
    echo    Puedes instalarlo desde: https://www.python.org/downloads/
    echo.
) else (
    for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
    echo %GREEN%[OK] Python encontrado: %PYTHON_VERSION%%RESET%
)

echo.
echo ========================================
echo   INSTALANDO BACKEND
echo ========================================
echo.

cd backend-sqlite
if %errorlevel% neq 0 (
    echo %RED%[ERROR] No se encontro la carpeta backend-sqlite%RESET%
    pause
    exit /b 1
)

echo %BLUE%Instalando dependencias del backend...%RESET%
call npm install
if %errorlevel% neq 0 (
    echo %RED%[ERROR] Error al instalar dependencias del backend%RESET%
    pause
    exit /b 1
)

echo %GREEN%[OK] Dependencias del backend instaladas%RESET%

:: Verificar si existe .env
if not exist .env (
    echo %YELLOW%[ADVERTENCIA] Archivo .env no encontrado. Creando desde .env.example...%RESET%
    if exist .env.example (
        copy .env.example .env >nul
        echo %GREEN%[OK] Archivo .env creado%RESET%
    ) else (
        echo %YELLOW%[ADVERTENCIA] .env.example no encontrado. Usando configuracion por defecto.%RESET%
    )
)

:: Crear directorios necesarios
if not exist database mkdir database
if not exist database\backups mkdir database\backups
if not exist logs mkdir logs
if not exist temp mkdir temp

echo %GREEN%[OK] Directorios creados%RESET%

:: Ejecutar migraciones
echo.
echo %BLUE%Ejecutando migraciones de base de datos...%RESET%
call npm run migrate
if %errorlevel% neq 0 (
    echo %YELLOW%[ADVERTENCIA] Error al ejecutar migraciones. Puede que la base de datos ya este inicializada.%RESET%
)

:: Ejecutar seeds (opcional)
echo.
set /p RUN_SEEDS="Deseas ejecutar los datos de prueba? (S/N): "
if /i "!RUN_SEEDS!"=="S" (
    echo %BLUE%Ejecutando seeds...%RESET%
    call npm run seed
    if %errorlevel% neq 0 (
        echo %YELLOW%[ADVERTENCIA] Error al ejecutar seeds.%RESET%
    )
)

cd ..

echo.
echo ========================================
echo   INSTALANDO FRONTEND DESKTOP
echo ========================================
echo.

cd frontend-desktop
if %errorlevel% neq 0 (
    echo %RED%[ERROR] No se encontro la carpeta frontend-desktop%RESET%
    pause
    exit /b 1
)

echo %BLUE%Instalando dependencias del frontend...%RESET%
call npm install
if %errorlevel% neq 0 (
    echo %RED%[ERROR] Error al instalar dependencias del frontend%RESET%
    pause
    exit /b 1
)

echo %GREEN%[OK] Dependencias del frontend instaladas%RESET%

cd ..

echo.
echo ========================================
echo   INSTALACION COMPLETADA
echo ========================================
echo.
echo %GREEN%[OK] Todo esta listo para usar la aplicacion%RESET%
echo.
echo Para iniciar la aplicación en modo desarrollo:
echo   1. Backend: cd backend-sqlite ^&^& npm start
echo   2. Frontend: cd frontend-desktop ^&^& npm run dev
echo.
echo Para crear el instalador ejecutable:
echo   Ejecutar: crear-instalador.bat
echo   O manualmente: cd frontend-desktop ^&^& npm run build:win
echo.
echo ========================================
echo.

pause

