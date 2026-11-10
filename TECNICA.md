# TECNICA.md — Especificación Técnica de Arquitectura (JARVIS-Matrix)

## 🏗️ 1. Pila Tecnológica y Dependencias

- **Runtime:** Node.js (v18+) configurado como Módulo ES (`"type": "module"` en resolución ESM).
- **Librerías de Node.js:**
  - `http` — Servidor HTTP nativo de alto rendimiento.
  - `googleapis` — SDK oficial para autenticación e interacción con Gmail API.
  - `luxon` — Gestión precisa de zona horaria (`Europe/Madrid`).
  - `child_process` (`exec`, `execSync`) — Ejecución segura de procesos nativos en Windows.
- **Entorno de Contenedores:** Docker Desktop con Docker Compose v2 para SearXNG (puerto 8889).
- **Shell Scripting:** PowerShell 7+ y Batch Scripting de Windows con bypass de políticas de ejecución.

---

## 🌐 2. Especificación Detallada de API Endpoints

### `/api/chat` (POST)
- **Seguridad:** Restringido a IPs locales (`isLocalIP`).
- **Función:** Actúa como proxy inverso transparente. Reenvía el payload JSON entrante hacia `http://localhost:3001/v1/chat/completions` adjuntando la cabecera `Authorization: Bearer <API_KEY>`.

### `/api/command` (POST)
- **Payload:** `{ "text": "instrucción en lenguaje natural" }`
- **Flujo:** Normaliza el texto quitando diacríticos (`normalizeText`). Compara patrones de expresiones regulares y estructuras de control para ejecutar acciones en el sistema local (Gmail, SearVGA, Spotify, explorador, apagado, etc.).
- **Retorno:** `{ "handled": true|false, "reply": "Texto de respuesta para TTS" }`

### `/api/system-status` (GET)
- **Función:** Recopila métricas del sistema operativo en tiempo real:
  - **CPU:** Muestreo de deltas entre tiempos idle y activos de cada núcleo.
  - **RAM:** `os.freemem()` vs `os.totalmem()`.
  - **Disco:** Parseo de comando `wmic logicaldisk get FreeSpace,Size /format:csv`.
  - **Servicios:** Pings HTTP a los puertos 3001 y 3002.

### Endpoints de Gmail (`/api/gmail/*`)
- `GET /api/gmail/messages`: Retorna el conjunto de correos recientes.
- `POST /api/gmail/filter`: Filtra por palabra clave recibida en la petición.
- `POST /api/gmail/clean-spam`: Desencadena el filtrado y limpieza de correos promocionales.

---

## 🛡️ 3. Mecanismos de Seguridad y Red

- **Validación de IP Local (`isLocalIP`):** Revisa que las peticiones entrantes provengan exclusivamente de `127.0.0.1`, `::1`, subredes `192.168.x.x` o `10.x.x.x`.
- **Cabeceras CORS (`sendCORS`):** Permite integración fluida entre orígenes locales de desarrollo.
- **Aislamiento de Comandos Shell:** Sanitización básica mediante expresiones regulares antes de pasar argumentos a `exec`.
