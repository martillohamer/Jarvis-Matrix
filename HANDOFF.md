# HANDOFF.md - Documentación Técnica MAESTRA

## 📌 1. Visión General del Proyecto

**Proyecto:** T-800 / JARVIS-Demo  
**Autor principal:** Sergio / "Manteka" / martillohamer  
**Curso:** 1º de DAW (Oviedo)  
**Tecnología:** Asistente de IA local con soporte de voz, chat y comandos del sistema.

---

## 🛠️ 2. Arquitectura y Stack Tecnológico

### Stack Principal:
- **Node.js (ESM):** Servidor proxy en puerto 3002
- **FreeLLMAPI:** Pasarela OpenAI-compatible en puerto 3001
- **Web Speech API:** Reconocimiento y síntesis de voz del navegador
- **Luxon:** Formateo de fechas/horas en zona Europa/Madrid
- **Open-Meteo:** API pública sin clave para datos meteorológicos de Oviedo

### Tecnologías Frontend:
- **HTML5/CSS3:** Estructura y estilos
- **JavaScript ES6+:** Lógica de aplicación
- **localStorage:** Memoria de conversación (máx. 12 mensajes)
- **speechSynthesis:** TTS nativo del navegador

---

## 🚀 3. Evolución por Fases

### **Fase 1: Órdenes Locales Rápidas** (`/api/command`)
- **Seguridad IP:** Whitelist local (127.0.0.1, ::1, 192.168.x.x, 10.x.x.x)
- **Comandos implementados:**
  - `que hora es` / `que dia es` → Respuesta con fecha/hora en castellano
  - `que tiempo hace` / `clima` → Consulta Open-Meteo para Oviedo (lat: 43.3603, lon: -5.8448)
  - `abre youtube/netflix/disney/spotify` → Apertura de URLs mediante exec (whitelist)
  - `apaga el pc` → Activación de 20s con confirmación
  - `si, apaga` → Ejecución `shutdown /s /t 30`
  - `cancela el apagado` → Ejecución `shutdown /a`

### **Fase 2: Memoria y Modos de IA**
- **Memoria de conversación:** localStorage con historial de 12 mensajes (alternado user/assistant)
- **Modos de IA dinámicos:**
  - **Modo Asistente:** Respuestas concisas, técnicas y directas
  - **Modo Amigo:** Conversación cercana, ingeniosa y natural
  - **Modo Estudio DAW:** Enfoque pedagógico en Java, SQL, lenguajes de marcas, entornos de desarrollo

### **Fase 3: HUD de Sistema en Tiempo Real**
- **Endpoint `/api/system-status`:** Métricas en tiempo real
  - CPU: Porcentaje de uso (cálculo por CPU deltas)
  - RAM: Memoria usada vs total
  - Disco: Espacio libre/uso de disco C:
  - Servicios: Estado de puertos 3001 (FreeLLMAPI) y 3002 (Jarvis)
- **HUD visual:** Consola con LED verde/rojo por servicio
- **Alerta por voz:** Notificación cuando un servicio cae

---

## 💡 4. Créditos e Inspiración

### Inspiración Original:
- **Demo base:** JARVIS-Demo inicial de Ale-Studios
- **Arquitectura:** FreeLLMAPI + Ollama + Web Speech API

### Adaptación y Mejoras:
- **Desarrollado por:** Sergio (martillohamer) - 1º de DAW en Oviedo
- **Mejoras implementadas:**
  - Sistema de comandos locales seguros
  - Memoria de conversación persistente
  - Modos de IA especializados (Amigo, Asistente, Estudio DAW)
  - HUD de sistema con monitorización en tiempo real
  - Integración Open-Meteo para clima de Oviedo
  - Apagado seguro con confirmación

### Repositorio Oficial:
- **GitHub:** https://github.com/martillohamer/Jarvis-Matrix