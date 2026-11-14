import { extractReply, trimHistory } from './lib.js';

const chatHistory = document.getElementById('chat-history');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const terminalLog = document.getElementById('terminal-log');
const clearChatBtn = document.getElementById('clear-chat-btn');
const exportSessionBtn = document.getElementById('export-session-btn');
const micStatusIndicator = document.getElementById('mic-status-indicator');
const modulator = document.getElementById('kitt-modulator');

const SYSTEM_PROMPT = { 
    role: 'system', 
    content: 'Eres JARVIS, una inteligencia artificial avanzada y servicial, integrada en la consola K.I.T.T. Tu tono es profesional, técnico y cortés. Respondes siempre en castellano.' 
};

let messages = [];

// Cargar de sessionStorage
try {
    const saved = sessionStorage.getItem('jarvis_messages');
    if (saved) {
        messages = JSON.parse(saved).slice(-50);
    } else {
        messages = [SYSTEM_PROMPT];
    }
} catch (e) {
    messages = [SYSTEM_PROMPT];
}

function logTerminal(msg) {
    const timeStr = new Date().toTimeString().split(' ')[0];
    const entry = document.createElement('div');
    entry.textContent = `[${timeStr}] ${msg}`;
    terminalLog.appendChild(entry);
    if (terminalLog.childNodes.length > 200) terminalLog.removeChild(terminalLog.firstChild);
    terminalLog.scrollTop = terminalLog.scrollHeight;
}

function renderMessages() {
    chatHistory.innerHTML = '';
    messages.forEach(msg => {
        if (msg.role === 'system') return;
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.role === 'user' ? 'user' : 'jarvis'}`;
        
        const sender = document.createElement('div');
        sender.className = 'bubble-sender';
        sender.textContent = msg.role === 'user' ? 'Comandante' : 'JARVIS // K.I.T.T. Core';
        
        const text = document.createElement('div');
        text.className = 'bubble-text';
        text.textContent = msg.content;
        
        bubble.appendChild(sender);
        bubble.appendChild(text);
        chatHistory.appendChild(bubble);
    });
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function handleUserSubmit() {
    const text = chatInput.value.trim();
    if (!text || chatInput.disabled) return;

    chatInput.value = '';
    chatInput.disabled = true;
    chatSendBtn.disabled = true;
    modulator.className = 'kitt-modulator-container modo-pensando';

    messages.push({ role: 'user', content: text });
    renderMessages();
    logTerminal(`Comando: "${text}"`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 100000);

    try {
        // 1. Intentar /api/command
        let reply;
        const cmdRes = await fetch('/api/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
            signal: controller.signal
        });
        
        const cmdData = await cmdRes.json();
        if (cmdData.handled) {
            reply = cmdData.reply;
        } else {
            // 2. Si no es comando, ir a /api/chat
            const chatRes = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: trimHistory(messages) }),
                signal: controller.signal
            });
            
            if (!chatRes.ok) throw new Error(`Servidor: ${chatRes.status}`);
            const chatData = await chatRes.json();
            reply = extractReply(chatData);
            if (chatData._degraded) {
                logTerminal('Aviso: Respuesta en modo degradado.');
            }
        }
        
        messages.push({ role: 'assistant', content: reply });
        renderMessages();
        sessionStorage.setItem('jarvis_messages', JSON.stringify(messages));
        
        modulator.className = 'kitt-modulator-container modo-hablando';
        if (window.speakResponse) window.speakResponse(reply);
        
        // El modo hablar se quita cuando termina la síntesis (ver voice-manager)
        // Por ahora simulamos fin tras 2s si no hay voz real
        if (!window.speechSynthesis || !window.speechSynthesis.speaking) {
             setTimeout(() => modulator.className = 'kitt-modulator-container modo-espera', 2000);
        }

    } catch (e) {
        const errorMsg = e.name === 'AbortError' ? 'Tiempo de espera agotado (100s).' : `Error: ${e.message}`;
        logTerminal(errorMsg);
        messages.push({ role: 'assistant', content: errorMsg });
        renderMessages();
        modulator.className = 'kitt-modulator-container modo-espera';
    } finally {
        clearTimeout(timeout);
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        chatInput.focus();
    }
}

chatSendBtn.addEventListener('click', handleUserSubmit);
chatInput.addEventListener('keydown', (e) => { 
    if (e.key === 'Enter' && !e.isComposing) handleUserSubmit(); 
});

clearChatBtn.addEventListener('click', () => {
    messages = [SYSTEM_PROMPT];
    sessionStorage.removeItem('jarvis_messages');
    renderMessages();
    logTerminal("Memoria purgada.");
});

exportSessionBtn.addEventListener('click', () => {
    const text = messages.filter(m => m.role !== 'system').map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis-sesion-${Date.now()}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
    logTerminal("Sesión exportada.");
});

// Telemetría Real
let telemetryTimeout;
async function updateTelemetry() {
    if (document.hidden) {
        telemetryTimeout = setTimeout(updateTelemetry, 10000);
        return;
    }
    
    try {
        const res = await fetch('/api/system-status');
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        document.getElementById('cpu-val').textContent = `${data.cpu.toFixed(1)}%`;
        document.getElementById('cpu-fill').style.width = `${data.cpu}%`;
        
        const ramPct = (data.ramUsed / data.ramTotal) * 100;
        document.getElementById('ram-val').textContent = `${(data.ramUsed/1024/1024/1024).toFixed(1)} GB`;
        document.getElementById('ram-fill').style.width = `${ramPct}%`;
        
        // Badges
        const updateBadge = (id, up) => {
            const el = document.getElementById(id);
            el.style.background = up ? 'rgba(0,255,100,0.2)' : 'rgba(255,50,50,0.2)';
            el.style.borderColor = up ? '#00ff64' : '#ff3232';
            el.style.color = up ? '#00ff64' : '#ff3232';
        };
        
        if (data.services) {
            data.services.forEach(s => {
                if (s.name === 'FreeLLMAPI') updateBadge('badge-freellmapi', s.up);
                if (s.name === 'JARVIS') updateBadge('badge-jarvis', s.up);
                if (s.name === 'SearVGA') updateBadge('badge-searvga', s.up);
            });
        }
        
        document.getElementById('telemetry-status').textContent = '[ESTABLE]';
        telemetryTimeout = setTimeout(updateTelemetry, 3000);
    } catch (e) {
        document.getElementById('telemetry-status').textContent = '[SIN CONEXIÓN]';
        telemetryTimeout = setTimeout(updateTelemetry, 10000);
    }
}

// Health Check al cargar
fetch('/api/health').then(r => r.json()).then(data => {
    if (data.online) logTerminal("Conexión neuronal establecida.");
    updateTelemetry();
}).catch(() => {
    logTerminal("ERROR: Nodo central fuera de línea.");
    document.getElementById('telemetry-status').textContent = '[SIN CONEXIÓN]';
});

// Listener para el Modulador (cambio de modo externo)
window.setKittMode = (mode) => {
    modulator.className = `kitt-modulator-container modo-${mode}`;
};
