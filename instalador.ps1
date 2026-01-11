# Script de PowerShell para instalar Gestor de Inventario J4 Pro
# Ejecutar con: .\instalador.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTALADOR - GESTOR DE INVENTARIO" -ForegroundColor Cyan
Write-Host "  J4 Pro Desktop Application" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si Node.js está instalado
Write-Host "Verificando requisitos del sistema..." -ForegroundColor Blue
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js no encontrado"
    }
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no está instalado." -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, instala Node.js desde: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Versión mínima requerida: Node.js 18.x o superior" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Verificar npm
try {
    $npmVersion = npm --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "npm no encontrado"
    }
    Write-Host "✅ npm encontrado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm no está instalado." -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Verificar Python (opcional)
try {
    $pythonVersion = python --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Python encontrado: $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Python no está instalado. La función de importación de productos puede no funcionar." -ForegroundColor Yellow
        Write-Host "   Puedes instalarlo desde: https://www.python.org/downloads/" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Python no está instalado. La función de importación de productos puede no funcionar." -ForegroundColor Yellow
    Write-Host "   Puedes instalarlo desde: https://www.python.org/downloads/" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTALANDO BACKEND" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Cambiar al directorio backend-sqlite
if (-not (Test-Path "backend-sqlite")) {
    Write-Host "❌ Error: No se encontró la carpeta backend-sqlite" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Set-Location "backend-sqlite"

# Instalar dependencias del backend
Write-Host "Instalando dependencias del backend..." -ForegroundColor Blue
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "Error al instalar dependencias"
    }
    Write-Host "✅ Dependencias del backend instaladas" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al instalar dependencias del backend" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Verificar si existe .env
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Archivo .env no encontrado. Creando desde .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ Archivo .env creado" -ForegroundColor Green
    } else {
        Write-Host "⚠️  .env.example no encontrado. Usando configuración por defecto." -ForegroundColor Yellow
    }
}

# Crear directorios necesarios
$directories = @("database", "database\backups", "logs", "temp")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

Write-Host "✅ Directorios creados" -ForegroundColor Green

# Ejecutar migraciones
Write-Host ""
Write-Host "Ejecutando migraciones de base de datos..." -ForegroundColor Blue
try {
    npm run migrate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Advertencia: Error al ejecutar migraciones. Puede que la base de datos ya esté inicializada." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Advertencia: Error al ejecutar migraciones. Puede que la base de datos ya esté inicializada." -ForegroundColor Yellow
}

# Ejecutar seeds (opcional)
Write-Host ""
$runSeeds = Read-Host "¿Deseas ejecutar los datos de prueba? (S/N)"
if ($runSeeds -eq "S" -or $runSeeds -eq "s") {
    Write-Host "Ejecutando seeds..." -ForegroundColor Blue
    try {
        npm run seed
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️  Advertencia: Error al ejecutar seeds." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Advertencia: Error al ejecutar seeds." -ForegroundColor Yellow
    }
}

Set-Location ".."

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTALANDO FRONTEND DESKTOP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Cambiar al directorio frontend-desktop
if (-not (Test-Path "frontend-desktop")) {
    Write-Host "❌ Error: No se encontró la carpeta frontend-desktop" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Set-Location "frontend-desktop"

# Instalar dependencias del frontend
Write-Host "Instalando dependencias del frontend..." -ForegroundColor Blue
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "Error al instalar dependencias"
    }
    Write-Host "✅ Dependencias del frontend instaladas" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al instalar dependencias del frontend" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Set-Location ".."

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTALACIÓN COMPLETADA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Todo está listo para usar la aplicación" -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar la aplicación en modo desarrollo:" -ForegroundColor Yellow
Write-Host "  1. Backend: cd backend-sqlite; npm start" -ForegroundColor White
Write-Host "  2. Frontend: cd frontend-desktop; npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Para crear el instalador ejecutable:" -ForegroundColor Yellow
Write-Host "  Ejecutar: .\crear-instalador.ps1" -ForegroundColor White
Write-Host "  O manualmente: cd frontend-desktop; npm run build:win" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Presiona Enter para continuar"



