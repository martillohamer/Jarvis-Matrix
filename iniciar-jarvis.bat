@echo off
chcp 65001 >nul
title JARVIS-Matrix Control Center

echo ==========================================
echo    INICIANDO SISTEMA JARVIS-MATRIX
echo ==========================================

:: 1. Iniciar FreeLLMAPI mediante su script oficial de PowerShell
echo [1/2] Arrancando pasarela FreeLLMAPI (puerto 3001)...
start "FreeLLMAPI" /d "C:\Users\astur\Desktop\freellmapi-opencode" powershell -NoExit -ExecutionPolicy Bypass -File "C:\Users\astur\Desktop\freellmapi-opencode\iniciar-freellmapi.ps1"

:: Pausa de 4 segundos para dar margen a que levante el puerto 3001
timeout /t 4 /nobreak >nul

:: 2. Iniciar el servidor backend de JARVIS fijando su directorio
echo [2/2] Arrancando Servidor JARVIS-Matrix (puerto 3002)...
start "JARVIS-Backend" /d "C:\Users\astur\Desktop\JARVIS-Demo" cmd /k "node --env-file=.env server.js"

echo ==========================================
echo  ¡Sistemas desplegados con éxito, señor!
echo ==========================================
pause