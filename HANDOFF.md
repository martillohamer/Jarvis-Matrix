# HANDOFF.md — Documentación Técnica y Estado del Proyecto

## 📌 1. Registro de Estado del Proyecto

**Estado:** 100% Operativo y Validado.  
**Fecha de actualización:** 10 de Noviembre de 2026.  
**Autor:** Sergio / "Manteka" (martillohamer) — 1º DAW (Oviedo).  
**Entorno de ejecución:** Windows 11 / Node.js ES Modules / Docker Desktop / PowerShell 7+.

---

## 🛠️ 2. Componentes Integrados y Funcionales

### A. Integración Gmail (`menu2informatico@gmail.com`)
- **Gestión por voz y texto:** El manejador `handleCommand` intercepta consultas sobre correos.
- **Búsquedas de remitentes y palabras clave:**
  - *"Telecable"*: Recupera información sobre promociones, fútbol y servicios de noviembre.
  - *"Empleo / Trabajo / DAW / Fichaje"*: Extrae alertas sobre oportunidades laborales y avisos académicos.
  - *"Limpieza de Spam"*: Filtra elementos de propaganda y ejecuta el borrado/traslado a papelera.
- **Endpoints de la API de Gmail:**
  - `GET /api/gmail/messages`: Retorna el listado de correos procesados.
  - `POST /api/gmail/filter`: Recibe `{ keyword }` y devuelve coincidencias.
  - `POST /api/gmail/clean-spam`: Ejecuta la rutina de limpieza.

### B. Integración SearVGA / Buscador Privado (Docker)
- **Ruta de la pila:** `C:\Users\astur\Desktop\searxng-nextgen`
- **Fichero de composición:** `docker-compose.prod.yml`
- **Puerto expuesto:** `8889`
- **Comando en lenguaje natural:** *"abre el navegador privado"*, *"inicia SearVGA"*. Lanza el archivo batch `Iniciar_SearVGA.bat` y abre `http://localhost:8889`.

### C. Automatización de Inicio (`start-jarvis.bat`)
- Comprueba si **Docker Desktop** está activo; si no lo está, lo ejecuta y aguarda al demonio.
- Levanta el entorno SearXNG en segundo plano (`docker compose up -d`).
- Verifica la pasarela FreeLLMAPI en el puerto `3001`.
- Ejecuta `node server.js` en el puerto `3002`.
- Abre el frontend web en `http://localhost:3002`.

---

## 🔬 3. Protocolo de Pruebas y Validación Sintáctica

Para validar la integridad del backend sin levantar todo el entorno:

```powershell
# Validación sintáctica en PowerShell
cd C:\Users\astur\Desktop\JARVIS-Demo
node --check server.js
```

**Resultado esperado:** Salida limpia (código de salida `0`).

---

## 📊 4. Cuadro de Puertos y Servicios

| Servicio | Puerto | Protocolo | Estado |
|----------|--------|-----------|--------|
| FreeLLMAPI Gateway | 3001 | HTTP | Operativo |
| JARVIS Node Server | 3002 | HTTP | Operativo |
| SearVGA (SearXNG) | 8889 | HTTP (Docker) | Operativo |
