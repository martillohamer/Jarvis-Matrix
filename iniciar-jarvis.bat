@echo off
chcp 65001 >nul
title JARVIS-Matrix Control Center

echo ==========================================
echo    INICIANDO SISTEMA JARVIS-MATRIX
echo ==========================================

:: Verificar que existe la carpeta de JARVIS
if not exist "C:\Users\astur\Desktop\JARVIS-Demo" (
    echo [ERROR] No se encuentra la carpeta de JARVIS-Demo
    pause
    exit /b 1
)

echo [1/2] Verificando puertos...

:: Verificar FreeLLMAPI en puerto 3001
echo Verificando FreeLLMAPI en puerto 3001...
cd /d "C:\Users\astur\Desktop\FreeLLMAPI" 2>nul
start "FreeLLMAPI" cmd /k "npm run dev" 2>nul
timeout /t 20 /nobreak >nul

:: Verificar JARVIS server en puerto 3002
echo Verificando JARVIS-Matrix en puerto 3002...
cd /d "C:\Users\astur\Desktop\JARVIS-Demo"
start "JARVIS-Matrix Backend" cmd /k "node --env-file=.env server.js"
timeout /t 15 /nobreak >nul

echo.
echo ==========================================
echo  SISTEMA JARVIS-MATRIX ACTIVO
echo ==========================================
echo.
echo Accede a la consola en: http://localhost:3002
echo FreeLLMAPI endpoint: http://localhost:3001/v1/chat/completions
echo.
pause