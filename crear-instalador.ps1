# Script de PowerShell para crear instalador ejecutable
# Ejecutar con: .\crear-instalador.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CREAR INSTALADOR EJECUTABLE" -ForegroundColor Cyan
Write-Host "  Gestor de Inventario J4 Pro" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en la carpeta correcta
if (-not (Test-Path "frontend-desktop\package.json")) {
    Write-Host "❌ Error: Este script debe ejecutarse desde la carpeta raíz del proyecto" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Verificar Node.js
try {
    $null = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js no encontrado"
    }
} catch {
    Write-Host "❌ Node.js no está instalado" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host "✅ Verificando instalación..." -ForegroundColor Green
Write-Host ""

# Verificar que las dependencias estén instaladas
if (-not (Test-Path "backend-sqlite\node_modules")) {
    Write-Host "⚠️  Dependencias del backend no instaladas. Instalando..." -ForegroundColor Yellow
    Set-Location "backend-sqlite"
    try {
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Error al instalar dependencias"
        }
    } catch {
        Write-Host "❌ Error al instalar dependencias del backend" -ForegroundColor Red
        Read-Host "Presiona Enter para salir"
        exit 1
    }
    Set-Location ".."
}

if (-not (Test-Path "frontend-desktop\node_modules")) {
    Write-Host "⚠️  Dependencias del frontend no instaladas. Instalando..." -ForegroundColor Yellow
    Set-Location "frontend-desktop"
    try {
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Error al instalar dependencias"
        }
    } catch {
        Write-Host "❌ Error al instalar dependencias del frontend" -ForegroundColor Red
        Read-Host "Presiona Enter para salir"
        exit 1
    }
    Set-Location ".."
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EMPAQUETANDO APLICACIÓN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "frontend-desktop"

# Empaquetar backend
Write-Host "📦 Empaquetando backend..." -ForegroundColor Blue
try {
    npm run prebuild
    if ($LASTEXITCODE -ne 0) {
        throw "Error al empaquetar backend"
    }
} catch {
    Write-Host "❌ Error al empaquetar backend" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host ""
Write-Host "📦 Compilando frontend..." -ForegroundColor Blue
try {
    npm run build:react
    if ($LASTEXITCODE -ne 0) {
        throw "Error al compilar frontend"
    }
} catch {
    Write-Host "❌ Error al compilar frontend" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host ""
Write-Host "📦 Creando instalador..." -ForegroundColor Blue
Write-Host "   Esto puede tardar varios minutos..." -ForegroundColor Yellow
Write-Host ""

try {
    npm run build:installer
    if ($LASTEXITCODE -ne 0) {
        throw "Error al crear instalador"
    }
} catch {
    Write-Host "❌ Error al crear instalador" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Set-Location ".."

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTALADOR CREADO EXITOSAMENTE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ El instalador se encuentra en:" -ForegroundColor Green
Write-Host "   frontend-desktop\dist-installer\" -ForegroundColor White
Write-Host ""
Write-Host "📋 Archivos generados:" -ForegroundColor Blue
Get-ChildItem "frontend-desktop\dist-installer\" | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
Write-Host ""
Write-Host "🚀 Puedes distribuir el archivo .exe a otros usuarios" -ForegroundColor Green
Write-Host ""

Read-Host "Presiona Enter para continuar"



