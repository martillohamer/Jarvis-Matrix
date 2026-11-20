import { rmsToDbfs } from './lib.js';

const micStatusIndicator = document.getElementById('mic-status-indicator');
const profileSelect = document.getElementById('voice-profile-select');
const statusLabel = document.getElementById('sphere-status-label');
const transcript = document.getElementById('sphere-transcript');
const voiceToggle = document.getElementById('voice-toggle');

// Configuración de perfiles
const PROFILES = {
    jarvis: { pitch: 1.0, rate: 0.9 },
    friday: { pitch: 1.2, rate: 1.0 },
    t800: { pitch: 0.5, rate: 0.8 },
    predator: { pitch: 0.2, rate: 0.7 }
};

// Cargar perfil guardado
try {
    const savedProfile = localStorage.getItem('jarvis_voice_profile');
    if (savedProfile) profileSelect.value = savedProfile;
} catch (e) {}

profileSelect.addEventListener('change', () => {
    localStorage.setItem('jarvis_voice_profile', profileSelect.value);
});

window.speakResponse = (text) => {
    if ((voiceToggle && !voiceToggle.checked) || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.substring(0, 400));
    const config = PROFILES[profileSelect.value] || PROFILES.jarvis;
    
    utterance.lang = 'es-ES';
    utterance.pitch = config.pitch;
    utterance.rate = config.rate;
    
    utterance.onstart = () => window.setKittMode('hablando');
    utterance.onend = () => {
        if (!window.isOverlayActive) window.setKittMode('espera');
        else if (window.isOverlayActive) startRecognition();
    };
    
    window.speechSynthesis.speak(utterance);
};

// Calibración
document.getElementById('start-calibration').addEventListener('click', async (e) => {
    e.target.disabled = true;
    micStatusIndicator.textContent = 'MIC: CALIBRANDO';
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 512;
        
        let sum = 0, peak = -Infinity, count = 0;
        const buffer = new Float32Array(analyser.frequencyBinCount);
        const start = Date.now();
        
        const loop = setInterval(() => {
            analyser.getFloatTimeDomainData(buffer);
            const val = rmsToDbfs(buffer);
            sum += val;
            if (val > peak) peak = val;
            count++;
            
            if (Date.now() - start > 4000) {
                clearInterval(loop);
                stream.getTracks().forEach(t => t.stop());
                audioCtx.close();
                
                const avg = count > 0 ? (sum / count).toFixed(1) : "-60.0";
                micStatusIndicator.textContent = 'MIC: LISTO';
                e.target.disabled = false;
                console.log(`Calibración: Media ${avg} dBFS, Pico ${peak.toFixed(1)} dBFS`);
                // Guardar umbral sugerido
                localStorage.setItem('jarvis_mic_threshold', (parseFloat(avg) + 10).toString());
            }
        }, 50);
    } catch (err) {
        micStatusIndicator.textContent = 'MIC: ERROR';
        console.warn('[CALIBRACION_MIC]', err?.name || err, err?.message || '');
        e.target.disabled = false;
    }
});

// Reconocimiento de Voz (Esfera)
let recognition;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = true;

    recognition.onstart = () => {
        if (statusLabel) statusLabel.textContent = 'ESCUCHANDO...';
        window.setKittMode('escuchando');
    };

    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        if (transcript) transcript.textContent = text;
        if (event.results[0].isFinal) {
            recognition.stop();
            if (statusLabel) statusLabel.textContent = 'PROCESANDO...';
            window.setKittMode('pensando');
            // Enviar al chat (usando el ID real del botón)
            const input = document.getElementById('chat-input');
            const sendBtn = document.getElementById('send-btn');
            if (input && sendBtn) {
                input.value = text;
                sendBtn.click();
            }
        }
    };

    recognition.onerror = () => {
        if (window.isOverlayActive) {
            if (statusLabel) statusLabel.textContent = 'ERROR DE MICRO';
            window.setKittMode('espera');
        }
    };
}

function startRecognition() {
    if (recognition && window.isOverlayActive && !window.speechSynthesis.speaking) {
        try { recognition.start(); } catch(e) {}
    }
}

// Control de Esfera (UI)
const overlay = document.getElementById('voice-overlay');
document.getElementById('launch-voice-sphere-btn').addEventListener('click', () => {
    window.isOverlayActive = true;
    overlay.classList.add('active');
    window.initCanvas();
    startRecognition();
});

document.getElementById('close-overlay').addEventListener('click', () => {
    window.isOverlayActive = false;
    overlay.classList.remove('active');
    if (recognition) recognition.stop();
    window.speechSynthesis.cancel();
    window.closeOverlay();
    window.setKittMode('espera');
});
