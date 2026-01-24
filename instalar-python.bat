@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   INSTALADOR DE PYTHON
echo   Para importacion de productos con IA
echo ========================================
echo.

REM Verificar si Python ya está instalado
echo Verificando instalacion de Python...
where python >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
    echo [OK] Python ya esta instalado: !PYTHON_VERSION!
    echo.
    echo Verificando dependencias de Python...
    python -m pip show pandas >nul 2>&1
    if %errorlevel% neq 0 (
        echo Instalando dependencias de Python...
        python -m pip install --upgrade pip
        python -m pip install pandas openpyxl xlrd pdfplumber google-generativeai
    ) else (
        echo [OK] Dependencias de Python estan instaladas
    )
    echo.
    echo ========================================
    echo   INSTALACION COMPLETA
    echo ========================================
    echo.
    pause
    exit /b 0
)

where py >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('py --version') do set PYTHON_VERSION=%%i
    echo [OK] Python ya esta instalado: !PYTHON_VERSION!
    echo.
    echo Verificando dependencias de Python...
    py -m pip show pandas >nul 2>&1
    if %errorlevel% neq 0 (
        echo Instalando dependencias de Python...
        py -m pip install --upgrade pip
        py -m pip install pandas openpyxl xlrd pdfplumber google-generativeai
    ) else (
        echo [OK] Dependencias de Python estan instaladas
    )
    echo.
    echo ========================================
    echo   INSTALACION COMPLETA
    echo ========================================
    echo.
    pause
    exit /b 0
)

echo [ADVERTENCIA] Python no esta instalado
echo.

REM Intentar instalar con winget
where winget >nul 2>&1
if %errorlevel% equ 0 (
    echo Intentando instalar Python con winget...
    echo Esto puede tardar varios minutos...
    echo.
    winget install Python.Python.3.11 --silent --accept-package-agreements --accept-source-agreements
    if %errorlevel% equ 0 (
        echo.
        echo [OK] Python instalado correctamente
        echo.
        echo Refrescando variables de entorno...
        call refreshenv >nul 2>&1
        timeout /t 3 >nul
        echo.
        echo Instalando dependencias de Python...
        py -m pip install --upgrade pip
        py -m pip install pandas openpyxl xlrd pdfplumber google-generativeai
        echo.
        echo ========================================
        echo   INSTALACION COMPLETA
        echo ========================================
        echo.
        echo [OK] Python ha sido instalado correctamente
        echo.
        echo [IMPORTANTE] Si Python no se encuentra despues de esto,
        echo    cierra y vuelve a abrir la aplicacion o reinicia tu terminal.
        echo.
        pause
        exit /b 0
    )
)

echo.
echo ========================================
echo   INSTALACION MANUAL
echo ========================================
echo.
echo Python no se pudo instalar automaticamente.
echo.
echo Por favor, sigue estos pasos:
echo.
echo 1. Descarga Python desde: https://www.python.org/downloads/
echo 2. Durante la instalacion, MARCA la opcion:
echo    [X] 'Add Python to PATH' (MUY IMPORTANTE)
echo 3. Completa la instalacion
echo 4. Reinicia la aplicacion
echo.
echo Despues de instalar, ejecuta este script nuevamente para
echo instalar las dependencias necesarias.
echo.

set /p ABRIR_NAVEGADOR="Deseas abrir la pagina de descarga de Python ahora? (S/N): "
if /i "%ABRIR_NAVEGADOR%"=="S" (
    start https://www.python.org/downloads/
)

echo.
pause
