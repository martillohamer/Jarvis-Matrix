@echo off
REM JARVIS Launcher - Batch wrapper for start-jarvis.ps1
REM Runs the PowerShell startup script with proper execution policy

powershell.exe -ExecutionPolicy Bypass -File "%~dp0start-jarvis.ps1"
pause