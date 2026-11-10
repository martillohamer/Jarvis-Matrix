# J.A.R.V.I.S. — Centro de Control Local (T-800 Matrix Protocol)

[![Platform](https://img.shields.io/badge/Windows-10%20%2F%2011-0078D6?logo=windows)](https://github.com/martillohamer/Jarvis-Matrix)
[![License](https://img.shields.io/badge/License-MIT-2ea44f)](LICENSE)
[![Repository](https://img.shields.io/badge/Repository-martillohamer%2FJarvis-Matrix-black?logo=github)](https://github.com/martillohamer/Jarvis-Matrix)

**Sistema Inteligente de Automatización Local y Asistente Personal para Windows 11.**  
JARVIS-Matrix conecta la interfaz web conversacional con la pasarela local de IA en el puerto 3001 (FreeLLMAPI), gestiona búsquedas en Gmail (`menu2informatico@gmail.com`), lanza el navegador privado SearVGA mediante Docker Compose, ofrece comandos multimedia (Spotify, YouTube, Disney+), control de carpetas locales y monitoriza el rendimiento de la máquina en tiempo real.

---

## 📐 Arquitectura del Sistema

El ecosistema local opera sobre tres servicios/puertos principales:

- **Puerto 3002 (JARVIS Server)** — Servidor backend Node.js en ES Modules. Gestiona endpoints `/api/*`, sirve archivos estáticos, procesa comandos en lenguaje natural e interactúa con el sistema operativo.
- **Puerto 3001 (FreeLLMAPI Gateway)** — Pasarela OpenAI-compatible local para inferencia con modelos LLM.
- **Puerto 8889 (SearVGA Private Browser)** — Instancia de SearXNG ejecutada en Docker Compose (`searxng-nextgen`) para búsquedas privadas sin rastreo.

---

## 🚀 Guía de Inicio Rápido

El proyecto incluye un script de arranque integral en la raíz:

### Lanzamiento Automático (Recomendado)
Ejecuta `start-jarvis.bat` (o `start-jarvis.ps1` desde PowerShell).

El script realizará las siguientes acciones:
1. Comprobará si Docker Desktop está en ejecución; si no es así, lo arrancará.
2. Desplegará los contenedores de SearVGA (`docker compose -f docker-compose.prod.yml up -d`).
3. Comprobará la disponibilidad de la pasarela FreeLLMAPI (puerto 3001).
4. Iniciará el servidor `node server.js` en el puerto 3002.
5. Abrirá automáticamente la consola de JARVIS en `http://localhost:3002`.

---

## ⚙️ Comandos Integrados en Lenguaje Natural

JARVIS procesa órdenes por voz o texto mediante `/api/command`:

### 📧 Gestión de Gmail (`menu2informatico@gmail.com`)
- **Buscar remitentes/asuntos específicos:** *"léeme el correo de Telecable"*, *"busca correo de empleo"*, *"avisos de trabajo"*.
- **Avisos académicos / DAW:** *"avisos de DAW"*, *"fichaje"*.
- **Limpieza de spam:** *"limpia el spam"*, *"elimina la propaganda"*, *"borra correos comerciales"*.
- **Resumen general:** *"léeme los correos"*, *"qué correos tenemos"*, *"bandeja de entrada"*.

### 🔍 Buscador Privado / SearVGA (Docker)
- *"abre el navegador privado"*, *"inicia SearVGA"*, *"buscador privado"*.
- Inicia la pila Docker de SearXNG y abre `http://localhost:8889`.

### 🎵 Comandos Multimedia
- **Spotify:** *"pon <canción/artista> en spotify"*, *"busca en spotify <query>"*, *"abre spotify"*.
- **YouTube:** *"pon <vídeo> en youtube"*, *"busca en youtube <query>"*, *"abre youtube"*.
- **Disney+:** *"busca en disney <película/serie>"*, *"busca en disney plus <query>"*, *"abre disney"*.
- **Netflix:** *"abre netflix"*.

### 📁 Explorador de Archivos del PC
- *"abre descargas"* → Abre `%USERPROFILE%\Downloads`.
- *"abre mis proyectos"* / *"abre repositorios"* → Abre `"D:\mis proyecto & repos"`.
- *"abre documentos"* → Abre `%USERPROFILE%\Documents`.

### 💻 Sistema y Utilidades
- **Fecha y Hora:** *"qué hora es"*, *"qué día es"*.
- **Clima:** *"qué tiempo hace"*, *"clima"* (Previsión meteorológica de Oviedo mediante Open-Meteo).
- **Apagado del PC:** *"apaga el pc"* (Pide confirmación. Confirmar con *"sí apaga"*, cancelar con *"cancela el apagado"*).

---

## 🛠️ Endpoints API (`server.js`)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/chat` | POST | Proxy inverso a FreeLLMAPI (`localhost:3001/v1/chat/completions`). |
| `/api/command` | POST | Procesador de lenguaje natural y ejecución de comandos locales. |
| `/api/system-status` | GET | Retorna métricas de CPU, RAM, uso de disco y estado de puertos. |
| `/api/health` | GET | Comprueba el estado de la pasarela FreeLLMAPI. |
| `/api/gmail/messages` | GET | Consulta los correos recientes de `menu2informatico@gmail.com`. |
| `/api/gmail/filter` | POST | Filtra correos según palabra clave (`{ keyword }`). |
| `/api/gmail/clean-spam` | POST | Ejecuta la rutina de limpieza de propaganda y spam. |
| `/api/execute` | POST | Ejecución directa de tareas del sistema (`launch-openmontage`, `launch-searxng`, `run-maintenance`, etc.). |

---

## 📖 Documentación Relacionada

- [HANDOFF.md](HANDOFF.md) — Estado actual del proyecto y cuaderno de traspaso técnico.
- [TECNICA.md](TECNICA.md) — Especificación técnica detallada de la arquitectura de software.
- [WELCOME.md](WELCOME.md) — Guía interactiva de uso del frontend.

---

## 📄 Licencia

MIT — Proyecto de código abierto de libre uso. Desarrollado y mantenido por **Sergio (martillohamer)** para el protocolo JARVIS-Matrix (T-800).
