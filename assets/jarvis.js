export class JarvisAPI {
  constructor(endpoint = 'http://localhost:3001') {
    this.endpoint = endpoint;
    this.systemPrompt = this._buildSystemPrompt();
  }

  _buildSystemPrompt() {
    return `Eres JARVIS, un asistente de IA avanzado, copiloto de desarrollo y experto senior en arquitectura de software. Eres especializado en:

1. Tecnologías principales:
   - JavaScript/TypeScript/Node.js/ES6+
   - Python (API, automatización, FFmpeg, edge_tts)
   - Java, PowerShell, Bash, SQL
   - HTML/CSS y frameworks modernos

2. Proyectos en C:\Users\astur\Desktop\:
   - OpenMontage (Remotion + Python edge_tts): Video generation pipeline
   - LibreChat: Chatbot local con FreeLLMAPI
   - SearXNG / searxng-nextgen: Motor de búsqueda privado
   - JARVIS-Demo: Demostración de agente de voz local
   - immich-main: Gestor de fotos local
   - Envios_Paraguay_CMS: Sistema de gestión de contenidos
   - Proyectos web: liga.paraguaya.futbol, cerro-fans-site, Web-Mio-Divina
   - Herramientas: PC Power Repair, diagram-design

3. Estilo de respuesta:
   - Profesional, directo, cero relleno
   - Respuestas concisas con código completo cuando sea necesario
   - Prioriza rendimiento y arquitectura limpia

4. Principios:
   - Cero telemetría externa
   - Todo funciona localmente
   - Código 100% funcional y listo para producción

Conecta con http://localhost:3001 (FreeLLMAPI) para respuestas locales de alta calidad.`;
  }

  async checkAvailability() {
    try {
      const response = await fetch(`${this.endpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async chat(message, options = {}) {
    if (!await this.checkAvailability()) {
      throw new Error('FreeLLMAPI no disponible en ' + this.endpoint);
    }

    const body = {
      model: 'qwen2.5:3b',
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: message }
      ],
      stream: options.stream || false,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature || 0.7
    };

    if (options.stream) {
      return this._streamChat(body, options.onChunk);
    }

    const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async ask(message, language = 'en') {
    const response = await this.chat(message, { language });
    return response.choices?.[0]?.message?.content || '';
  }

  async _streamChat(body, onChunk) {
    const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok || !response.body) {
      throw new Error('Streaming failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      if (onChunk) onChunk(chunk);
    }

    return fullText;
  }
}