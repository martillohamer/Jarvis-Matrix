import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join, normalize } from 'path';
import { readFileSync, existsSync, statSync } from 'fs';
import { exec } from 'child_process';
import { DateTime } from 'luxon';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = 3002;
const PUBLIC_DIR = join(__dirname, '.');

const API_KEY = process.env.OPENAI_API_KEY || 'freellmapi-ffb3545e333329d3923bf0a5411271eafa58d9c46ed739d5';
const FREELLM_URL = 'http://localhost:3001';

const ALLOWED_APPS = {
  youtube: 'start "" https://www.youtube.com',
  netflix: 'start "" https://www.netflix.com/browse',
  disney: 'start "" https://www.disneyplus.com',
  spotify: 'start "" spotify:'
};

const ALLOWED_APPS_URLS = {
  youtube: 'https://www.youtube.com',
  netflix: 'https://www.netflix.com/browse',
  disney: 'https://www.disneyplus.com',
  spotify: 'spotify:'
};

let pendingShutdown = false;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function isLocalIP(req) {
  const clientIP = req.socket.remoteAddress || '';
  const cleanIP = clientIP.replace(/:$/, '');
  if (cleanIP === '127.0.0.1' || cleanIP === '::1') return true;
  if (cleanIP.startsWith('192.168.')) return true;
  if (cleanIP.startsWith('10.')) return true;
  return false;
}

function sendCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJSON(res, status, obj) {
  sendCORS(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function serveStatic(req, res) {
  sendCORS(res);

  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const safePath = normalize(urlPath).replace(/^(\.\.[/\\])/, '');
  const filePath = join(PUBLIC_DIR, safePath === '/' || safePath === '\\' ? 'index.html' : safePath);

  if (!filePath.startsWith(PUBLIC_DIR) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('404 Not Found');
  }

  const ext = filePath.split('.').pop();
  const contentType = MIME_TYPES['.' + ext] || 'application/octet-stream';

  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 Internal Server Error');
  }
}

function normalizeText(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

async function handleCommand(text) {
  const normalized = normalizeText(text);

  if (normalized.includes('que hora es') || normalized.includes('hora')) {
    const now = DateTime.now().setZone('Europe/Madrid');
    const reply = `Son las ${now.hour.toString().padStart(2, '0')} horas y ${now.minute.toString().padStart(2, '0')} minutos.`;
    return { handled: true, reply };
  }

  if (normalized.includes('que dia es') || normalized.includes('día es') || normalized.includes('día')) {
    const now = DateTime.now().setZone('Europe/Madrid');
    const days = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    const dayName = days[now.weekday % 7];
    const reply = `Hoy es ${dayName}, ${now.day} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][now.month - 1]} de ${now.year}.`;
    return { handled: true, reply };
  }

  if (normalized.includes('que tiempo hace') || normalized.includes('clima')) {
    try {
      const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=43.3603&longitude=-5.8448&current=temperature_2m&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_probability&forecast_days=1');
      const data = await response.json();
      const temp = data.current.temperature_2m;
      const rain = data.current.precipitation_probability || 0;
      const reply = `En Oviedo hace ${temp}°C con ${rain}% de probabilidad de lluvia.`;
      return { handled: true, reply };
    } catch (e) {
      return { handled: true, reply: 'No he podido obtener el clima en este momento.' };
    }
  }

  if (normalized.includes('abre youtube')) {
    exec(ALLOWED_APPS.youtube, () => {});
    return { handled: true, reply: 'Abriendo YouTube...' };
  }

  if (normalized.includes('abre netflix')) {
    exec(ALLOWED_APPS.netflix, () => {});
    return { handled: true, reply: 'Abriendo Netflix...' };
  }

  if (normalized.includes('abre disney')) {
    exec(ALLOWED_APPS.disney, () => {});
    return { handled: true, reply: 'Abriendo Disney+...' };
  }

  if (normalized.includes('abre spotify')) {
    exec(ALLOWED_APPS.spotify, () => {});
    return { handled: true, reply: 'Abriendo Spotify...' };
  }

  if (normalized.includes('apaga el pc')) {
    pendingShutdown = true;
    setTimeout(() => { pendingShutdown = false; }, 20000);
    return { handled: true, reply: '¿Seguro? Di "sí, apaga" para confirmar.' };
  }

  if (normalized.includes('si apaga') || normalized.includes('sí apaga')) {
    if (pendingShutdown) {
      exec('shutdown /s /t 30', () => {});
      pendingShutdown = false;
      return { handled: true, reply: 'El PC se apagará en 30 segundos. Puedes cancelar diciendo "cancela el apagado".' };
    }
  }

  if (normalized.includes('cancela el apagado')) {
    pendingShutdown = false;
    exec('shutdown /a', () => {});
    return { handled: true, reply: 'Apagado cancelado.' };
  }

  return { handled: false };
}

async function handleAPI(req, res) {
  const url = req.url.split('?')[0];

  if (req.method === 'OPTIONS') {
    sendCORS(res);
    res.writeHead(204);
    return res.end();
  }

  if (url === '/api/command' && req.method === 'POST') {
    if (!isLocalIP(req)) {
      return sendJSON(res, 403, { error: 'Forbidden' });
    }

    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const { text } = JSON.parse(body);
        if (!text || typeof text !== 'string') {
          return sendJSON(res, 400, { error: 'Invalid text' });
        }

        const result = await handleCommand(text);
        console.log('Comando procesado:', text, '-> handled:', result.handled);

        if (result.handled) {
          return sendJSON(res, 200, result);
        }
        return sendJSON(res, 200, result);
      } catch (e) {
        return sendJSON(res, 400, { error: e.message });
      }
    });
    return;
  }

  if (url === '/api/chat' && req.method === 'POST') {
    if (!isLocalIP(req)) {
      return sendJSON(res, 403, { error: 'Forbidden' });
    }

    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        const forwardBody = { ...parsed, model: 'auto' };
        const upstream = await fetch(`${FREELLM_URL}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify(forwardBody)
        });
        const data = await upstream.json();
        console.log('Respuesta de FreeLLMAPI:', data);
        sendJSON(res, upstream.status, data);
      } catch (e) {
        sendJSON(res, 502, { error: 'Proxy error', details: e.message });
      }
    });
    return;
  }

  if (url === '/api/health' && req.method === 'GET') {
    try {
      const upstream = await fetch(`${FREELLM_URL}/v1/models`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${API_KEY}` },
        signal: AbortSignal.timeout(3000)
      });
      return sendJSON(res, 200, { online: upstream.ok, status: upstream.status });
    } catch (e) {
      return sendJSON(res, 200, { online: false, error: e.message });
    }
  }

  if (url === '/api/execute' && req.method === 'POST') {
    if (!isLocalIP(req)) {
      return sendJSON(res, 403, { error: 'Forbidden' });
    }

    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        const { command, target } = JSON.parse(body);
        let execCommand = '';

        switch (command) {
          case 'launch-openmontage':
            execCommand = 'cd /d "C:\\Users\\astur\\Desktop\\OpenMontage" && npm run dev';
            break;
          case 'launch-searxng':
            execCommand = 'cd /d "C:\\Users\\astur\\Desktop\\searxng-nextgen" && start "" Iniciar_SearVGA.bat';
            break;
          case 'run-maintenance':
            execCommand = 'powershell.exe -ExecutionPolicy Bypass -File "C:\\Users\\astur\\Desktop\\Dev-Maintenance-Windows.ps1"';
            break;
          case 'open-folder': {
            const cleanTarget = target && /^[\w\-. ]+$/.test(target) ? target : 'Jarvis-Matrix';
            execCommand = `explorer "C:\\Users\\astur\\Desktop\\${cleanTarget}"`;
            break;
          }
          default:
            return sendJSON(res, 400, { success: false, error: 'Comando no reconocido' });
        }

        exec(execCommand, (error) => {
          if (error) console.error(`Error de ejecución: ${error.message}`);
        });

        sendJSON(res, 200, { success: true, command, message: `Ejecutado correctamente: ${command}` });
      } catch (e) {
        sendJSON(res, 400, { success: false, error: e.message });
      }
    });
    return;
  }

  sendJSON(res, 404, { error: 'Not found' });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    handleAPI(req, res).catch(e => sendJSON(res, 500, { error: e.message }));
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`JARVIS Automation Server running at http://localhost:${PORT}`);
  console.log(`Serving static files from: ${PUBLIC_DIR}`);
  console.log(`API endpoints: /api/health, /api/chat, /api/command, /api/execute`);
});