param(
)

Write-Host "==================================================" -ForegroundColor Green
Write-Host "       [ JARVIS - T-800 MATRIX PROTOCOL ]         " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Green

# 1. Check FreeLLMAPI Gateway (Port 3001)
Write-Host "[*] Checking FreeLLMAPI Gateway on port 3001..." -ForegroundColor Yellow
$gatewayCheck = Test-NetConnection -ComputerName localhost -Port 3001 -WarningAction SilentlyContinue
if ($gatewayCheck.TcpTestSucceeded) {
    Write-Host "[+] FreeLLMAPI Gateway is ONLINE (Port 3001)." -ForegroundColor Green
} else {
    Write-Host "[!] WARNING: FreeLLMAPI Gateway is NOT responding on port 3001!" -ForegroundColor Red
    Write-Host "[!] Please ensure the FreeLLMAPI gateway is powered on/running." -ForegroundColor Yellow
}

# 2. Check JARVIS Node.js Server (Port 3002)
Write-Host "[*] Checking JARVIS server on port 3002..." -ForegroundColor Yellow
$jarvisCheck = Test-NetConnection -ComputerName localhost -Port 3002 -WarningAction SilentlyContinue

if ($jarvisCheck.TcpTestSucceeded) {
    Write-Host "[+] JARVIS server is already running on port 3002." -ForegroundColor Green
} else {
    Write-Host "[*] JARVIS server not detected. Starting server.js..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit -Command `"node server.js`"" -WorkingDirectory $PSScriptRoot
    
    Write-Host "[*] Waiting 2 seconds for server initialization..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}

# 3. Open Browser
Write-Host "[*] Opening JARVIS in default browser (http://localhost:3002)..." -ForegroundColor Cyan
Start-Process "http://localhost:3002"

Write-Host "==================================================" -ForegroundColor Green
Write-Host "       [ SYSTEM ONLINE - WELCOME BACK SIR ]       " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Green
