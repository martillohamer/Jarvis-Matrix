export class VoiceManager {
  constructor() {
    this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    this.synth = window.speechSynthesis;
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
  }

  speak(text, lang = 'en-US') {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    this.synth.speak(utterance);
  }

  listen(callback) {
    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      callback(transcript);
    };
    this.recognition.start();
  }
}
