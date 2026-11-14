@echo off
rem FreeLLMAPI corre en Docker (contenedor freellmapi-main-freellmapi-1).
rem Ajusta FREELLM_DIR a la carpeta donde esta su docker-compose.yml.
set "FREELLM_DIR=%USERPROFILE%\Desktop\freellmapi-main"
if not exist "%FREELLM_DIR%\docker-compose.yml" (
  echo [ERROR] No encuentro docker-compose.yml en "%FREELLM_DIR%". Edita FREELLM_DIR en este .bat.
  pause
  exit /b 1
)
cd /d "%FREELLM_DIR%"
docker compose up -d
echo.
docker ps --filter "name=freellmapi" --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
pause
