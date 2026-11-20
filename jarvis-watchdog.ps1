# Jarvis Watchdog - Monitoreo de Hardware y Alertas Nativas de Windows
param(
    [int]$CpuThreshold = 90,
    [int]$IntervalSeconds = 15
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Show-JarvisNotification {
    param([string]$Title, [string]$Message, [string]$IconType = "Warning")
    
    $notification = New-Object System.Windows.Forms.NotifyIcon
    $notification.Icon = [System.Drawing.SystemIcons]::($IconType)
    $notification.BalloonTipTitle = "J.A.R.V.I.S. // $Title"
    $notification.BalloonTipText = $Message
    $notification.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::($IconType)
    $notification.Visible = $True
    $notification.ShowBalloonTip(5000)
}

Write-Host ">>> [JARVIS WATCHDOG] Iniciando supervisión táctica de sistemas..." -ForegroundColor Cyan

while ($true) {
    # 1. Medir uso promedio de CPU
    $cpuLoad = (Get-WmiObject Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
    
    # 2. Verificar estado de FreeLLMAPI (Puerto 3001)
    $freeLLMUp = Test-NetConnection -ComputerName localhost -Port 3001 -WarningAction SilentlyContinue | Select-Object -ExpandProperty TcpTestSucceeded

    if ($cpuLoad -ge $CpuThreshold) {
        Show-JarvisNotification -Title "ALERTA DE SOBRECARGA" -Message "Señor, el uso de CPU ha alcanzado el $cpuLoad%. Rendimiento crítico detectado." -IconType "Error"
    }

    if (-not $freeLLMUp) {
        Show-JarvisNotification -Title "FALLO DE NÚCLEO" -Message "Atención: La pasarela FreeLLMAPI en el puerto 3001 no responde." -IconType "Error"
    }

    Start-Sleep -Seconds $IntervalSeconds
}