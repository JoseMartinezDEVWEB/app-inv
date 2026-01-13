# Script para detener el proceso que usa el puerto 4000
Write-Host "Buscando proceso en puerto 4000..."

$process = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess

if ($process) {
    $processId = $process
    $processInfo = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($processInfo) {
        Write-Host "Proceso encontrado: $($processInfo.ProcessName) (PID: $processId)"
        Write-Host "Deteniendo proceso..."
        Stop-Process -Id $processId -Force
        Write-Host "✅ Proceso detenido exitosamente"
    } else {
        Write-Host "⚠️ No se pudo obtener información del proceso"
    }
} else {
    Write-Host "ℹ️ No hay proceso usando el puerto 4000"
}

Write-Host "Presiona cualquier tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

