# ==============================================================================
# SCRIPT DE INICIO MAESTRO // JARVIS-MATRIX T-800
# ==============================================================================

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "      INICIANDO CENTRO DE MANDO JARVIS-MATRIX     " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Validar pasarela local en el puerto 3001
Write-Host "[*] Comprobando pasarela local en http://localhost:3001..." -ForegroundColor Yellow
$portCheck = Test-NetConnection -ComputerName localhost -Port 3001 -WarningAction SilentlyContinue

if ($portCheck.TcpTestSucceeded) {
    Write-Host "[OK] Pasarela local de IA (FreeLLMAPI) detectada y en línea." -ForegroundColor Green
} else {
    Write-Host "[WARNING] El puerto 3001 no responde. Asegúrate de iniciar tu servicio local de IA." -ForegroundColor Yellow
}

# 2. Abrir la interfaz web principal
$indexPath = "$PSScriptRoot\index.html"
if (-not (Test-Path $indexPath)) {
    $indexPath = "$PWD\index.html"
}

if (Test-Path $indexPath) {
    Write-Host "[*] Desplegando interfaz gráfica de Jarvis-Matrix..." -ForegroundColor Cyan
    Start-Process $indexPath
    Write-Host "[OK] Interfaz abierta correctamente." -ForegroundColor Green
} else {
    Write-Host "[ERROR] No se encontró el archivo index.html en la ruta." -ForegroundColor Red
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "      SISTEMA OPERATIVO Y LISTO PARA OPERAR       " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
