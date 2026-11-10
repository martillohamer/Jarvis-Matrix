# J.A.R.V.I.S. — Centro de Control Local (T-800 Edition)

[![Platform](https://img.shields.io/badge/Windows-10%20%2F%2011-0078D6?logo=windows)](../../releases/latest)
[![License](https://img.shields.io/badge/License-MIT-2ea44f)](LICENSE)
[![Repository](https://img.shields.io/badge/Repository-martillohamer%2FJarvis-Matrix-black?logo=github)](https://github.com/martillohamer/Jarvis-Matrix)

**Asistente personal de código abierto diseñado para Windows 11.**  
Conectado a FreeLLMAPI (puerto 3001) a través de un proxy local en Node.js (puerto 3002), con órdenes locales rápidas, HUD de sistema en tiempo real y perfiles de estudio DAW (Java, SQL, lenguajes de marcas y entornos).

---

### Tecnología Principal

- **Node.js (ESM)** — Servidor proxy y sistema de comandos
- **FreeLLMAPI** — Pasarela OpenAI-compatible en puerto 3001
- **Web Speech API** — Reconocimiento y síntesis de voz del navegador
- **Luxon** — Formateo de fechas/horas en zona Europa/Madrid
- **Open-Meteo** — Datos meteorológicos de Oviedo (sin API key)
- **LocalStorage** — Memoria de conversación (máx. 12 mensajes)

---

### 🚀 Guía de Inicio Rápido

1. **Arrancar FreeLLMAPI**  
   Inicia la pasarela local de IA en el puerto 3001: `localhost:3001`

2. **Iniciar Servidor JARVIS**  
   ```bash
   node server.js
   ```
   Levanta el backend proxy y sistema de comandos en el puerto 3002: `localhost:3002`

3. **Abrir y Hablar**  
   Accede a `http://localhost:3002`, abre la consola interactiva o interactúa con la esfera de voz.

---

### ✨ Características

- 🌍 **Multilingüe** — Inglés, Italiano, Español, Francés, Portugués, Hindi
- ⚡ **Comandos locales** — Hora, clima (Oviedo), abrir apps, apagado seguro
- 🎙️ **Modo voz avanzado** — Esfera interactiva con detección neural
- 📊 **HUD en tiempo real** — Monitor CPU, RAM, disco y estado de servicios
- 🎓 **Modos de IA** — Asistente, Amigo, Estudio DAW

---

### 📖 Documentación

| Documento | Qué cubre |
|---|---|
| [HANDOFF.md](HANDOFF.md) | Documentación técnica MAESTRA |
| [WELCOME.md](WELCOME.md) | Guía de bienvenida y configuración |
| [LICENSE](LICENSE) | MIT — libre uso |

---

### 🔧 Endpoints del Servidor (puerto 3002)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/chat` | POST | Comunicación con FreeLLMAPI |
| `/api/command` | POST | Órdenes locales (`{text}`) |
| `/api/system-status` | GET | Estado del sistema (CPU, RAM, disco, servicios) |
| `/api/health` | GET | Health check del servidor |

---

### 💡 Créditos y Autoría

Desarrollado y adaptado por **Sergio (martillohamer)** para el proyecto T-800, basado en la interfaz de demostración de código abierto de **Ale-Studios**.

**Repositorio oficial:** https://github.com/martillohamer/Jarvis-Matrix

---

### 📄 Licencia

MIT — libre uso. Ver [LICENSE](LICENSE)