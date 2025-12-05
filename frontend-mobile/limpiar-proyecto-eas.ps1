# Script de PowerShell para limpiar proyecto Expo antes de EAS Build
# Ejecutar con: .\limpiar-proyecto-eas.ps1

Write-Host "================================" -ForegroundColor Cyan
Write-Host "🔧 LIMPIEZA COMPLETA DEL PROYECTO" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 1. Eliminar carpetas nativas
Write-Host "📁 Eliminando carpetas nativas..." -ForegroundColor Yellow

if (Test-Path "android") {
    Remove-Item -Path "android" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ Carpeta android/ eliminada" -ForegroundColor Green
} else {
    Write-Host "   ℹ Carpeta android/ no existe" -ForegroundColor Gray
}

if (Test-Path "ios") {
    Remove-Item -Path "ios" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ Carpeta ios/ eliminada" -ForegroundColor Green
} else {
    Write-Host "   ℹ Carpeta ios/ no existe" -ForegroundColor Gray
}

Write-Host ""

# 2. Limpiar node_modules y archivos de bloqueo
Write-Host "🗑️ Limpiando node_modules y caché..." -ForegroundColor Yellow

if (Test-Path "node_modules") {
    Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ node_modules eliminado" -ForegroundColor Green
}

if (Test-Path "package-lock.json") {
    Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ package-lock.json eliminado" -ForegroundColor Green
}

if (Test-Path ".expo") {
    Remove-Item -Path ".expo" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ Caché de Expo eliminado" -ForegroundColor Green
}

Write-Host ""

# 3. Limpiar caché de npm
Write-Host "🧹 Limpiando caché de npm..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "   ✓ Caché de npm limpiado" -ForegroundColor Green

Write-Host ""

# 4. Reinstalar dependencias
Write-Host "📦 Instalando dependencias limpias..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "✅ LIMPIEZA COMPLETADA" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Verificación
Write-Host "🔍 Verificando limpieza..." -ForegroundColor Cyan
Write-Host ""

$androidExists = Test-Path "android"
$iosExists = Test-Path "ios"

if (-not $androidExists -and -not $iosExists) {
    Write-Host "✅ Carpetas nativas eliminadas correctamente" -ForegroundColor Green
} else {
    Write-Host "⚠️ ADVERTENCIA: Aún existen carpetas nativas" -ForegroundColor Red
    if ($androidExists) { Write-Host "   - android/ todavía existe" -ForegroundColor Red }
    if ($iosExists) { Write-Host "   - ios/ todavía existe" -ForegroundColor Red }
}

Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host "   1. Verifica que NO exista carpeta android/ o ios/" -ForegroundColor White
Write-Host "   2. Ejecuta: eas build -p android --profile preview" -ForegroundColor White
Write-Host ""
Write-Host "⚠️ IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   - NO ejecutes 'expo prebuild'" -ForegroundColor White
Write-Host "   - NO ejecutes 'expo run:android'" -ForegroundColor White
Write-Host "   - Usa siempre 'eas build' para compilar" -ForegroundColor White
Write-Host ""
