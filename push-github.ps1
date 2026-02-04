# Script para subir a GitHub evitando proxy 127.0.0.1:9
# Ejecuta en PowerShell: .\push-github.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Desactivar proxy que pueda apuntar a 127.0.0.1:9
$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""
$env:ALL_PROXY = ""

Write-Host "Subiendo a GitHub (origin main)..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Push completado correctamente." -ForegroundColor Green
} else {
    Write-Host "Si pide usuario/contraseña, usa tu usuario de GitHub y un Personal Access Token (PAT) como contraseña." -ForegroundColor Yellow
}
