@echo off
echo ========================================
echo   Generador de APK - J4 Pro Mobile
echo ========================================
echo.

:: Verificar si EAS CLI está instalado
where eas >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] EAS CLI no esta instalado
    echo.
    echo Instalando EAS CLI...
    call npm install -g eas-cli
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] No se pudo instalar EAS CLI
        pause
        exit /b 1
    )
)

echo [OK] EAS CLI esta instalado
echo.

:: Menú de opciones
echo Selecciona el tipo de build:
echo.
echo 1. SQLite Local - Base de Datos Local (Funciona con/sin Internet)
echo 2. Verificar estado de builds
echo 3. Salir
echo.

set /p choice="Ingresa tu opcion (1-3): "

if "%choice%"=="1" goto sqlite
if "%choice%"=="2" goto status
if "%choice%"=="3" goto end

echo Opcion invalida
pause
exit /b 1

:sqlite
echo.
echo ========================================
echo   Generando APK MODO LOCAL
echo ========================================
echo.
echo - Modo: BASE DE DATOS LOCAL (SQLite)
echo - Backend: Base de datos en el dispositivo
echo - Login: admin@j4pro.com / Jose.1919
echo - Perfil: production-local
echo.
echo CARACTERISTICAS:
echo   * Funciona CON o SIN internet
echo   * Login local con validacion de credenciales
echo   * Datos guardados en SQLite local
echo   * Usuario admin predeterminado incluido
echo.
echo Iniciando build...
call npm run build:production-local
goto end


:status
echo.
echo ========================================
echo   Estado de Builds
echo ========================================
echo.
call eas build:list --platform android --limit 10
echo.
pause
goto end

:end
echo.
echo ========================================
echo   Proceso completado
echo ========================================
echo.
echo Para ver el estado de tus builds:
echo https://expo.dev/accounts/jose_alberto19/projects/gestor-inventario-j4-pro/builds
echo.

pause
