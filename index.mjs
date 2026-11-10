import { JarvisAPI } from './assets/jarvis.js';
import { VoiceManager } from './assets/voice-manager.js';

const jarvis = new JarvisAPI();
const voice = new VoiceManager();
voice.setLanguage('es-ES');

let consoleOpen = false;

function createConsole() {
  const panel = document.createElement('div');
  panel.className = 'console-panel';
  panel.innerHTML = `
      <div class="console-header">
        <h3>JARVIS Console</h3>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="state-indicator" id="api-status">
            <span class="state-dot offline"></span>
            <span>API</span>
          </div>
          <div class="state-indicator" id="voice-status">
            <span class="state-dot offline"></span>
            <span>Voice</span>
          </div>
          <button class="console-close" aria-label="Close console">&times;</button>
        </div>
      </div>
      <div class="console-messages" id="console-messages">
        <div class="msg system">Sistemas inicializados. Conectando a http://localhost:3001...</div>
      </div>
      <div class="console-input">
        <input type="text" id="console-input" placeholder="Message JARVIS..." autocomplete="off">
        <button id="console-send">Enviar</button>
        <button class="speaker-btn" id="voice-toggle" title="Toggle voice">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
        </button>
      </div>
    `;
  document.body.appendChild(panel);
  return panel;
}

let apiOnline = false;

async function checkAPIStatus() {
  const status = document.getElementById('api-status');
  const dot = status?.querySelector('.state-dot');
  try {
    const ok = await jarvis.checkAvailability();
    if (ok && dot) {
      dot.className = 'state-dot online';
      status.querySelector('span:last-child').textContent = 'API Online';
      apiOnline = true;
    } else if (dot && !apiOnline) {
      dot.className = 'state-dot offline';
      status.querySelector('span:last-child').textContent = 'API Offline';
      addMessage('system', '✗ FreeLLMAPI no disponible. Inicia el servidor en puerto 3001');
    }
  } catch (e) {
    if (dot && !apiOnline) dot.className = 'state-dot offline';
  }
}

function normalizeName(name) {
  const lower = name.toLowerCase().trim();
  if (lower === 'yarbis' || lower === 'yervis') return 'jarvis';
  return lower;
}

function addMessage(role, content) {
  const container = document.getElementById('console-messages');
  if (!container) return;
  const msg = document.createElement('div');
  msg.className = `msg ${role}`;
  msg.textContent = content;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

async function sendMessage(text, fromVoice = false) {
  if (!text.trim()) return;
  addMessage('user', text);
  
  const thinkingMsg = document.createElement('div');
  thinkingMsg.className = 'msg thinking';
  thinkingMsg.textContent = 'Pensando...';
  const container = document.getElementById('console-messages');
  if (container) {
    container.appendChild(thinkingMsg);
    container.scrollTop = container.scrollHeight;
  }
  
  try {
    const response = await jarvis.chat(text);
    if (container && thinkingMsg.parentNode) {
      thinkingMsg.parentNode.removeChild(thinkingMsg);
    }
    addMessage('assistant', response);
    
    if (fromVoice) {
      voice.speak(response);
    } else {
      const voiceToggle = document.getElementById('voice-toggle');
      if (voiceToggle?.classList.contains('active')) {
        voice.speak(response);
      }
    }
  } catch (e) {
    if (container && thinkingMsg.parentNode) {
      thinkingMsg.parentNode.removeChild(thinkingMsg);
    }
    addMessage('system', `Error: ${e.message}`);
  }
}

voice.on('onStart', () => {
  const dot = document.getElementById('voice-status')?.querySelector('.state-dot');
  const sphere = document.getElementById('voice-sphere');
  if (dot) dot.className = 'state-dot listening';
  if (sphere) sphere.classList.add('listening');
});

voice.on('onEnd', () => {
  const dot = document.getElementById('voice-status')?.querySelector('.state-dot');
  const sphere = document.getElementById('voice-sphere');
  if (dot) dot.className = 'state-dot online';
  if (sphere) sphere.classList.remove('listening');
});

voice.on('onSynthesisStart', () => {
  const dot = document.getElementById('voice-status')?.querySelector('.state-dot');
  const sphere = document.getElementById('voice-sphere');
  if (dot) dot.className = 'state-dot speaking';
  if (sphere) sphere.classList.add('speaking');
});

voice.on('onSynthesisEnd', () => {
  const dot = document.getElementById('voice-status')?.querySelector('.state-dot');
  const sphere = document.getElementById('voice-sphere');
  if (dot) dot.className = 'state-dot online';
  if (sphere) sphere.classList.remove('speaking');
});

voice.on('onError', (err) => {
  const dot = document.getElementById('voice-status')?.querySelector('.state-dot');
  const sphere = document.getElementById('voice-sphere');
  if (dot) dot.className = 'state-dot offline';
  if (sphere) sphere.classList.remove('listening', 'speaking');
  addMessage('system', `Voice error: ${err.message}`);
});

document.addEventListener('DOMContentLoaded', () => {
  const panel = createConsole();
  checkAPIStatus();
  
  const sphere = document.getElementById('voice-sphere');
  sphere?.addEventListener('click', () => {
    if (sphere.classList.contains('listening')) {
      voice.stopListening();
    } else {
      voice.listen((transcript) => {
        const input = panel.querySelector('#console-input');
        if (input) input.value = transcript;
        sendMessage(transcript, true);
      });
    }
  });
  
  document.querySelector('.btn-primary')?.addEventListener('click', (e) => {
    e.preventDefault();
    panel.style.display = 'flex';
    consoleOpen = true;
  });
  
  panel.querySelector('.console-close')?.addEventListener('click', () => {
    panel.style.display = 'none';
    consoleOpen = false;
  });
  
  const input = panel.querySelector('#console-input');
  const sendBtn = panel.querySelector('#console-send');
  const send = () => {
    const text = input.value.trim();
    if (text) {
      sendMessage(text, false);
      input.value = '';
    }
  };
  
  sendBtn?.addEventListener('click', send);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send();
  });
  
  const voiceToggle = panel.querySelector('#voice-toggle');
  voiceToggle?.addEventListener('click', () => {
    voiceToggle.classList.toggle('active');
  });
  
  setInterval(checkAPIStatus, 30000);
});