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
echo 1. Preview (RECOMENDADO) - Backend en la nube
echo 2. Local Test - Backend local (requiere configuracion)
echo 3. Production - Version de produccion
echo 4. Verificar estado de builds
echo 5. Salir
echo.

set /p choice="Ingresa tu opcion (1-5): "

if "%choice%"=="1" goto preview
if "%choice%"=="2" goto local
if "%choice%"=="3" goto production
if "%choice%"=="4" goto status
if "%choice%"=="5" goto end

echo Opcion invalida
pause
exit /b 1

:preview
echo.
echo ========================================
echo   Generando APK Preview
echo ========================================
echo.
echo - Backend: https://appj4-hlqj.onrender.com/api
echo - Perfil: preview
echo - Tiempo estimado: 10-20 minutos
echo.
echo Iniciando build...
call npm run build:preview
goto end

:local
echo.
echo ========================================
echo   Generando APK Local Test
echo ========================================
echo.
echo IMPORTANTE: Antes de continuar, asegurate de:
echo 1. Tener Docker instalado y corriendo
echo 2. Configurar la IP correcta en eas.json
echo.
pause
echo.
echo Iniciando build local...
call npm run build:local
goto end

:production
echo.
echo ========================================
echo   Generando APK Production
echo ========================================
echo.
echo - Backend: https://appj4-hlqj.onrender.com/api
echo - Perfil: production
echo - Version optimizada
echo.
echo Iniciando build...
call npm run build:production
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

:: Si hay builds en progreso, mostrar link
echo Para ver el estado de tus builds:
echo https://expo.dev/accounts/jose_alberto19/projects/gestor-inventario-j4-pro/builds
echo.

pause
