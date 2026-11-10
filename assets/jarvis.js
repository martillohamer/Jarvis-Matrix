const CHAT_HISTORY_KEY = 'jarvis_chat_history';
const MAX_HISTORY = 12;

function loadHistory() {
  try {
    const stored = localStorage.getItem(CHAT_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

export class JarvisAPI {
  constructor(endpoint = 'http://localhost:3002') {
    this.endpoint = endpoint;
    this.mode = 'assistant';
    this.systemPrompt = this._buildSystemPrompt();
  }

  _buildSystemPrompt() {
    const now = new Date();
    const date = now.toLocaleDateString('es-ES');
    const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    const modes = {
      friend: `Eres JARVIS, tu amigo cercano con un toque ingenioso. Conversa de forma natural, directa y amistosa.`,
      study: `Eres JARVIS, un experto senior. Explica Java, bases de datos (SQL), lenguajes de marcas (HTML/CSS) y entornos de desarrollo. Usa un lenguaje técnico preciso, haz preguntas de comprobación pedagógicas y explica paso a paso.`,
      assistant: `Eres JARVIS, un asistente técnico conciso y directo. Responde con el máximo detalle técnico necesario y código funcional.`
    };

    return `Eres JARVIS, un asistente de voz y chat. Hoy es ${date}, son las ${time}.
    
${modes[this.mode]}

Responde siempre en el idioma del usuario. No inventes acceso a sistemas, monitoreo ni datos que no tengas.`;
  }

  setMode(mode) {
    if (['friend', 'study', 'assistant'].includes(mode)) {
      this.mode = mode;
      this.systemPrompt = this._buildSystemPrompt();
    }
  }

  getMode() {
    return this.mode;
  }

  async checkAvailability() {
    try {
      const response = await fetch(`${this.endpoint}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      const data = await response.json();
      return data.online === true;
    } catch (error) {
      return false;
    }
  }

  async checkCommand(text) {
    try {
      const response = await fetch(`${this.endpoint}/api/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      return await response.json();
    } catch (error) {
      return { handled: false };
    }
  }

  async chat(message, options = {}) {
    if (!await this.checkAvailability()) {
      throw new Error('FreeLLMAPI no disponible en ' + this.endpoint);
    }

    const history = loadHistory();
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...history,
      { role: 'user', content: message }
    ];

    const body = {
      model: 'auto',
      messages: messages,
      stream: options.stream || false,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature || 0.7
    };

    if (options.stream) {
      return this._streamChat(body, options.onChunk, message);
    }

    const response = await fetch(`${this.endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const content = this._extractContent(data);
    
    const newHist = [...history, { role: 'user', content: message }, { role: 'assistant', content: content }];
    saveHistory(newHist.slice(-MAX_HISTORY * 2));
    
    return content || '';
  }

  _extractContent(data) {
    if (!data) return '';
    if (typeof data === 'string') return data;
    if (data.choices && Array.isArray(data.choices) && data.choices[0]) {
      const msg = data.choices[0].message;
      if (msg && msg.content) return msg.content;
    }
    if (data.response) return data.response;
    if (data.text) return data.text;
    return '';
  }

  async ask(message, language = 'en') {
    return await this.chat(message, { language });
  }

  async _streamChat(body, onChunk, lastUserMessage) {
    const response = await fetch(`${this.endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok || !response.body) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Streaming failed');
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

    const history = loadHistory();
    const newHist = [...history, { role: 'user', content: lastUserMessage }, { role: 'assistant', content: fullText }];
    saveHistory(newHist.slice(-MAX_HISTORY * 2));

    return fullText;
  }
}

export function clearHistory() {
  localStorage.removeItem(CHAT_HISTORY_KEY);
}

export function getMode() {
  const mode = localStorage.getItem('jarvis_mode') || 'assistant';
  return mode;
}

export function setMode(mode) {
  localStorage.setItem('jarvis_mode', mode);
}