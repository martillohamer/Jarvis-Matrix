function Send-JarvisCommand {
    param(
        [Parameter(Mandatory=$true, Position=0)]
        [string]$Text,

        [Parameter(Mandatory=$false, Position=1)]
        [string]$Command,

        [Parameter(Mandatory=$false, Position=2)]
        [string]$Target
    )

    begin {
        $serverUrl = "http://localhost:3002"
        $commandEndpoint = "$serverUrl/api/command"
        $executeEndpoint = "$serverUrl/api/execute"
        $systemStatusEndpoint = "$serverUrl/api/system-status"
    }

    process {
        try {
            if ($PSBoundParameters.ContainsKey('Command')) {
                $bodyHash = @{
                    command = $Command
                }
                if ($PSBoundParameters.ContainsKey('Target')) {
                    $bodyHash.target = $Target
                }
                $body = $bodyHash | ConvertTo-Json -Depth 4

                $response = Invoke-RestMethod -Method Post -Uri $executeEndpoint -Body $body -ContentType "application/json"
                Write-Host "`n=== RESPUESTA SERVIDOR (Execute) ===`n" -ForegroundColor Cyan
                Write-Host "Comando: $Command"
                if ($Target) { Write-Host "Objetivo: $Target" }
                $statusMsg = $response.success
                $msg = if ($response.message) { $response.message } else { 'Sin mensaje' }
                Write-Host "Estado: $statusMsg`nMensaje: $msg"
                if ($response.error) {
                    Write-Error "Error del servidor: $($response.error)"
                }
            }
            elseif ($Text) {
                $body = @{ text = $Text } | ConvertTo-Json -Depth 3

                $response = Invoke-RestMethod -Method Post -Uri $commandEndpoint -Body $body -ContentType "application/json"

                Write-Host "`n=== RESPUESTA SERVIDOR (Command) ===`n" -ForegroundColor Green
                Write-Host "Enviado: $Text`nRespuesta manejada: $($response.handled)"

                if ($response.handled) {
                    Write-Host "Respuesta: $($response.reply | Out-String)" -ForegroundColor White
                } else {
                    Write-Host "Comando no reconocido. El servidor reenviará a FreeLLMAPI." -ForegroundColor Yellow
                }

                if ($response.error) {
                    Write-Error "Error: $($response.error)"
                }
            }
            elseif ($Text -eq "estado del sistema" -or $Text -eq "system status") {
                Write-Host "`n=== OBTENIENDO ESTADO DEL SISTEMA ===`n" -ForegroundColor Magenta
                try {
                    $status = Invoke-RestMethod -Method Get -Uri $systemStatusEndpoint
                    Write-Host "CPU: $($status.cpu)% de carga" -ForegroundColor Gray
                    Write-Host "RAM: $($status.ramUsed)% de uso" -ForegroundColor Gray
                    $diskFreeGB = [math]::Round($status.diskFree / (1GB), 2)
                    $diskTotalGB = [math]::Round($status.diskTotal / (1GB), 2)
                    Write-Host "Disco: $diskFreeGB GB libres de $diskTotalGB GB" -ForegroundColor Gray
                    Write-Host "Servicios:" -ForegroundColor Gray
                    $status.services | ForEach-Object {
                        $statusText = if ($_.up) { "EN LÍNEA" } else { "FUERA" }
                        Write-Host "  - $($_.name) (Puerto $($_.port)): $statusText"
                    }
                } catch {
                    Write-Error "No se pudo conectar al servidor: $_"
                }
            }
            else {
                Write-Error "Parámetros inválidos. Use -Text 'comando', -Command con -Target, o 'estado del sistema'."
            }
        }
        catch {
            Write-Error "`n❌ No se pudo conectar al servidor JARVIS en http://localhost:3002`nAsegúrese de que el servidor esté ejecutándose con: node server.js`nO verifique que el puerto 3002 no esté en uso por otro proceso."
        }
    }
}