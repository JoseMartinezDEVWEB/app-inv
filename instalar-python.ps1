# Script de PowerShell para instalar Python automaticamente
# Ejecutar con: .\instalar-python.ps1
# Requiere permisos de administrador

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTALADOR DE PYTHON" -ForegroundColor Cyan
Write-Host "  Para importacion de productos con IA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Funcion para verificar si Python esta instalado
function Test-PythonInstalled {
    $comandos = @('py', 'python', 'python3')
    foreach ($cmd in $comandos) {
        try {
            $version = & $cmd --version 2>$null
            if ($LASTEXITCODE -eq 0 -and $version) {
                return @{ Instalado = $true; Comando = $cmd; Version = $version }
            }
        } catch {
            continue
        }
    }
    return @{ Instalado = $false; Comando = $null; Version = $null }
}

# Verificar si Python ya esta instalado
Write-Host "Verificando instalacion de Python..." -ForegroundColor Blue
$pythonInfo = Test-PythonInstalled

if ($pythonInfo.Instalado) {
    Write-Host "[OK] Python ya esta instalado: $($pythonInfo.Version)" -ForegroundColor Green
    Write-Host "   Comando disponible: $($pythonInfo.Comando)" -ForegroundColor Green
    Write-Host ""
    
    # Verificar e instalar dependencias de Python
    Write-Host "Verificando dependencias de Python..." -ForegroundColor Blue
    $pythonCmd = $pythonInfo.Comando
    
    $dependencias = @('pandas', 'openpyxl', 'xlrd', 'pdfplumber', 'google-generativeai')
    $faltantes = @()
    
    foreach ($dep in $dependencias) {
        try {
            $result = & $pythonCmd -m pip show $dep 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK] $dep esta instalado" -ForegroundColor Green
            } else {
                Write-Host "  [ADVERTENCIA] $dep no esta instalado" -ForegroundColor Yellow
                $faltantes += $dep
            }
        } catch {
            Write-Host "  [ADVERTENCIA] $dep no esta instalado" -ForegroundColor Yellow
            $faltantes += $dep
        }
    }
    
    if ($faltantes.Count -gt 0) {
        Write-Host ""
        Write-Host "Instalando dependencias faltantes..." -ForegroundColor Blue
        try {
            & $pythonCmd -m pip install --upgrade pip
            & $pythonCmd -m pip install $faltantes
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[OK] Dependencias instaladas correctamente" -ForegroundColor Green
            } else {
                Write-Host "[ADVERTENCIA] Hubo un problema al instalar algunas dependencias" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "[ERROR] Error al instalar dependencias: $_" -ForegroundColor Red
        }
    } else {
        Write-Host ""
        Write-Host "[OK] Todas las dependencias estan instaladas" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  INSTALACION COMPLETA" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Presiona Enter para salir"
    exit 0
}

Write-Host "[ADVERTENCIA] Python no esta instalado" -ForegroundColor Yellow
Write-Host ""

# Verificar si tenemos permisos de administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[ADVERTENCIA] Se recomienda ejecutar este script como Administrador" -ForegroundColor Yellow
    Write-Host "   (Clic derecho > Ejecutar como administrador)" -ForegroundColor Yellow
    Write-Host ""
}

# Intentar instalar con winget (Windows Package Manager)
Write-Host "Intentando instalar Python con winget..." -ForegroundColor Blue
try {
    $wingetCheck = Get-Command winget -ErrorAction SilentlyContinue
    if ($wingetCheck) {
        Write-Host "[OK] winget esta disponible" -ForegroundColor Green
        Write-Host "Instalando Python 3.11 (ultima version estable)..." -ForegroundColor Blue
        Write-Host "Esto puede tardar varios minutos..." -ForegroundColor Yellow
        Write-Host ""
        
        # Instalar Python con winget (silencioso, agregar al PATH)
        $process = Start-Process -FilePath "winget" -ArgumentList "install", "Python.Python.3.11", "--silent", "--accept-package-agreements", "--accept-source-agreements" -Wait -PassThru -NoNewWindow
        
        if ($process.ExitCode -eq 0) {
            Write-Host "[OK] Python instalado correctamente con winget" -ForegroundColor Green
            
            # Refrescar variables de entorno
            Write-Host "Refrescando variables de entorno..." -ForegroundColor Blue
            $machinePath = [System.Environment]::GetEnvironmentVariable("Path","Machine")
            $userPath = [System.Environment]::GetEnvironmentVariable("Path","User")
            $env:Path = "$machinePath;$userPath"
            
            # Esperar un momento para que el sistema actualice
            Start-Sleep -Seconds 3
            
            # Verificar instalacion
            $pythonInfo = Test-PythonInstalled
            if ($pythonInfo.Instalado) {
                Write-Host "[OK] Python verificado: $($pythonInfo.Version)" -ForegroundColor Green
                $pythonCmd = $pythonInfo.Comando
            } else {
                Write-Host "[ADVERTENCIA] Python instalado pero no encontrado en PATH. Puede requerir reiniciar la terminal." -ForegroundColor Yellow
                Write-Host "   Intentando con 'py'..." -ForegroundColor Yellow
                $pythonCmd = "py"
            }
            
            # Instalar dependencias
            Write-Host ""
            Write-Host "Instalando dependencias de Python..." -ForegroundColor Blue
            try {
                & $pythonCmd -m pip install --upgrade pip
                & $pythonCmd -m pip install pandas openpyxl xlrd pdfplumber google-generativeai
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "[OK] Dependencias instaladas correctamente" -ForegroundColor Green
                } else {
                    Write-Host "[ADVERTENCIA] Hubo un problema al instalar dependencias" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "[ADVERTENCIA] Error al instalar dependencias: $_" -ForegroundColor Yellow
                Write-Host "   Puedes instalarlas manualmente despues con:" -ForegroundColor Yellow
                Write-Host "   pip install pandas openpyxl xlrd pdfplumber google-generativeai" -ForegroundColor White
            }
            
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Cyan
            Write-Host "  INSTALACION COMPLETA" -ForegroundColor Cyan
            Write-Host "========================================" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "[OK] Python ha sido instalado correctamente" -ForegroundColor Green
            Write-Host ""
            Write-Host "[IMPORTANTE] Si Python no se encuentra despues de esto," -ForegroundColor Yellow
            Write-Host "   cierra y vuelve a abrir la aplicacion o reinicia tu terminal." -ForegroundColor Yellow
            Write-Host ""
            Read-Host "Presiona Enter para salir"
            exit 0
        } else {
            Write-Host "[ADVERTENCIA] winget no pudo instalar Python automaticamente" -ForegroundColor Yellow
            Write-Host "   Codigo de salida: $($process.ExitCode)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[ADVERTENCIA] winget no esta disponible" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ADVERTENCIA] No se pudo usar winget: $_" -ForegroundColor Yellow
}

# Metodo alternativo: Descargar e instalar manualmente
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTALACION MANUAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Python no se pudo instalar automaticamente." -ForegroundColor Yellow
Write-Host ""
Write-Host "Por favor, sigue estos pasos:" -ForegroundColor White
Write-Host ""
Write-Host "1. Descarga Python desde: https://www.python.org/downloads/" -ForegroundColor White
Write-Host "2. Durante la instalacion, MARCA la opcion:" -ForegroundColor White
Write-Host "   [X] Add Python to PATH (MUY IMPORTANTE)" -ForegroundColor Yellow
Write-Host "3. Completa la instalacion" -ForegroundColor White
Write-Host "4. Reinicia la aplicacion" -ForegroundColor White
Write-Host ""
Write-Host "Despues de instalar, ejecuta este script nuevamente para" -ForegroundColor White
Write-Host "instalar las dependencias necesarias." -ForegroundColor White
Write-Host ""

# Preguntar si desea abrir el navegador
$abrirNavegador = Read-Host "Deseas abrir la pagina de descarga de Python ahora? (S/N)"
if ($abrirNavegador -eq "S" -or $abrirNavegador -eq "s") {
    Start-Process "https://www.python.org/downloads/"
}

Write-Host ""
Read-Host "Presiona Enter para salir"
