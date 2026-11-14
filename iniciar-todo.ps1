Write-Host "[1/3] Verificando FreeLLMAPI en Docker..." -ForegroundColor Cyan
Set-Location "C:\Users\astur\Desktop\freellmapi-main"
docker compose up -d

Write-Host "[+] Esperando a que FreeLLMAPI inicialice..." -ForegroundColor Yellow
Start-Sleep -Seconds 6

Write-Host "[2/3] Arrancando JARVIS-Matrix (Puerto 3002)..." -ForegroundColor Cyan
Set-Location "C:\Users\astur\Desktop\JARVIS-Demo"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\astur\Desktop\JARVIS-Demo'; node server.js"

Write-Host "[3/3] Abriendo interfaz en el navegador..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
Start-Process "http://localhost:3002"

Write-Host "`n[ÉXITO] ¡Sistema JARVIS en marcha!" -ForegroundColor Green