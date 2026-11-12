@echo off
chcp 65001 >nul
title JARVIS-Matrix Control Center

echo ==========================================
echo    INICIANDO SISTEMA JARVIS-MATRIX
echo ==========================================

:: 1. Iniciar FreeLLMAPI en su ruta correspondiente
echo [1/2] Arrancando pasarela FreeLLMAPI (puerto 3001)...
cd /d "C:\Users\astur\Desktop\FreeLLMAPI"
start cmd /k "npm run dev"

:: Pausa breve para asegurar que el puerto 3001 esté activo
timeout /t 3 /nobreak >nul

:: 2. Iniciar el servidor backend de JARVIS
echo [2/2] Arrancando Servidor JARVIS-Matrix (puerto 3002)...
cd /d "C:\Users\astur\Desktop\JARVIS-Demo"
start cmd /k "node --env-file=.env server.js"

echo ==========================================
echo  ¡Sistemas desplegados con éxito, señor!
echo ==========================================
pause