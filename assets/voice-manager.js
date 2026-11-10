export class VoiceManager {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = SpeechRecognition ? new SpeechRecognition() : null;
    this.synth = window.speechSynthesis;
    this.currentLang = 'es-ES';
    this.voices = [];
    this.callbacks = {
      onResult: null,
      onStart: null,
      onEnd: null,
      onError: null,
      onSynthesisStart: null,
      onSynthesisEnd: null
    };

    if (this.recognition) {
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.onresult = (event) => this._handleResult(event);
      this.recognition.onerror = (event) => this._handleError(event);
      this.recognition.onend = () => this._trigger('onEnd', false);
    }

    this._loadVoices();
  }

  _loadVoices() {
    if (!this.synth.onvoiceschanged) return;
    this.synth.onvoiceschanged = () => {
      this.voices = this.synth.getVoices();
    };
    this.voices = this.synth.getVoices();
  }

  setLanguage(lang) {
    const langMap = {
      'es': 'es-ES',
      'es-PY': 'es-PY',
      'en': 'en-US',
      'en-GB': 'en-GB',
      'it': 'it-IT',
      'fr': 'fr-FR',
      'pt': 'pt-PT',
      'hi': 'hi-IN'
    };
    this.currentLang = langMap[lang] || 'es-ES';
    if (this.recognition) this.recognition.lang = this.currentLang;
  }

  on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) this.callbacks[event] = callback;
  }

  _trigger(event, ...args) {
    if (this.callbacks[event]) this.callbacks[event](...args);
  }

  speak(text) {
    if (!text) return;

    console.log('speak:', text);

    const loadVoices = () => {
      return new Promise((resolve) => {
        const voices = this.synth.getVoices();
        if (voices.length > 0) {
          this.voices = voices;
          resolve();
        } else {
          this.synth.onvoiceschanged = () => {
            this.voices = this.synth.getVoices();
            resolve();
          };
        }
      });
    };

    loadVoices().then(() => {
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.currentLang;
      const voice = this.voices.find(v => v.lang === this.currentLang) || 
                    this.voices.find(v => v.lang.startsWith(this.currentLang.split('-')[0]));
      if (voice) utterance.voice = voice;

      utterance.onstart = () => this._trigger('onSynthesisStart', true);
      utterance.onend = () => this._trigger('onSynthesisEnd', false);

      this.synth.speak(utterance);
    });
  }

  listen(onTranscript = null) {
    if (!this.recognition) {
      this._trigger('onError', new Error('Web Speech API no soportado'));
      return false;
    }

    this.recognition.start();
    this._trigger('onStart', true);

    if (onTranscript) this.on('onResult', onTranscript);
    return true;
  }

  stopListening() {
    if (this.recognition) this.recognition.stop();
  }

  _handleResult(event) {
    const transcript = event.results[event.results.length - 1][0].transcript;
    if (event.results[0].isFinal) {
      this._trigger('onResult', transcript);
    }
  }

  _handleError(event) {
    const error = new Error(event.error || 'Error de reconocimiento');
    this._trigger('onError', error);
  }

  getStatus() {
    return {
      listening: this.recognition && this.recognition.lang ? 'active' : 'idle',
      speaking: this.synth.speaking ? 'active' : 'idle',
      language: this.currentLang,
      voices: this.voices.map(v => ({ lang: v.lang, name: v.name }))
    };
  }
}