@echo off
title JARVIS-Matrix Launcher (T-800)
color 0A
echo.
echo ========================================
echo    [ JARVIS - T-800 MATRIX PROTOCOL ]
echo ========================================
echo.

REM Verificar Docker Desktop
echo [*] Checking Docker Desktop...
docker version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [!] Docker Desktop no está corriendo. Iniciando...
    start "" "C:\Programa\Docker\Docker\Docker Desktop.exe"
    timeout /t 15 /nobreak >nul
)

REM Iniciar SearVGA (Docker Compose)
echo [*] Starting SearVGA containers...
cd /d "C:\Users\astur\Desktop\searxng-nextgen"
docker compose -f docker-compose.prod.yml up -d
if %ERRORLEVEL% neq 0 (
    echo [!] Warning: No se pudo iniciar SearVGA. Asegúrate de que docker-compose exista.
)

cd /d "C:\Users\astur\Desktop\JARVIS-Demo"

REM Verificar FreeLLMAPI Gateway
powershell -Command "Test-NetConnection -ComputerName localhost -Port 3001 -WarningAction SilentlyContinue | Select-Object -ExpandProperty TcpTestSucceeded" > temp_check.txt
set /p GATEWAY_STATUS=<temp_check.txt
del temp_check.txt
if "%GATEWAY_STATUS%"=="True" (
    echo [+] FreeLLMAPI Gateway ONLINE (puerto 3001).
) else (
    echo [!] WARNING: FreeLLMAPI Gateway NO está respondiendo en puerto 3001.
)

REM Verificar si JARVIS ya está corriendo
powershell -Command "Test-NetConnection -ComputerName localhost -Port 3002 -WarningAction SilentlyContinue | Select-Object -ExpandProperty TcpTestSucceeded" > temp_check2.txt
set /p JARVIS_STATUS=<temp_check2.txt
del temp_check2.txt
if "%JARVIS_STATUS%"=="True" (
    echo [+] JARVIS server already running on port 3002.
) else (
    echo [*] Starting JARVIS server...
    start "JARVIS" powershell -NoExit -Command "cd /d 'C:\Users\astur\Desktop\JARVIS-Demo' && node server.js"
    timeout /t 2 /nobreak >nul
)

REM Abrir navegador
echo [*] Opening JARVIS console...
start "" "http://localhost:3002"

echo.
echo ========================================
echo    [ SYSTEM ONLINE - WELCOME BACK SIR ]
echo ========================================