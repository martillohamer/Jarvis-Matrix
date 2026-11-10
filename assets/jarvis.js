export class JarvisAPI {
  constructor(endpoint = 'http://localhost:3002') {
    this.endpoint = endpoint;
    this.systemPrompt = this._buildSystemPrompt();
  }

  _buildSystemPrompt() {
    return `Eres JARVIS, un asistente de voz y chat, educado, conciso (máximo 3-4 frases salvo que se pida más) y con un toque ingenioso. Responde siempre en el idioma del usuario. No inventes acceso a sistemas, monitoreo ni datos que no tengas.`;
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

  async chat(message, options = {}) {
    if (!await this.checkAvailability()) {
      throw new Error('FreeLLMAPI no disponible en ' + this.endpoint);
    }

    const body = {
      model: 'auto',
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

    const response = await fetch(`${this.endpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

  async _streamChat(body, onChunk) {
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

    return fullText;
  }
}