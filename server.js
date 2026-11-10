import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join, normalize } from 'path';
import { readFileSync, existsSync, statSync } from 'fs';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = 3002;
const PUBLIC_DIR = join(__dirname, '.');

const API_KEY = process.env.OPENAI_API_KEY || 'freellmapi-ffb3545e333329d3923bf0a5411271eafa58d9c46ed739d5';
const FREELLM_URL = 'http://localhost:3001';

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

  // Quitamos ?query y evitamos salir de la carpeta del proyecto
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
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

async function handleAPI(req, res) {
  const url = req.url.split('?')[0];

  // Preflight CORS para cualquier ruta /api/*
  if (req.method === 'OPTIONS') {
    sendCORS(res);
    res.writeHead(204);
    return res.end();
  }

  // ---------- Proxy de chat hacia FreeLLMAPI ----------
  if (url === '/api/chat' && req.method === 'POST') {
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

  // ---------- Health check real ----------
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

  // ---------- Ejecutar comandos locales ----------
  if (url === '/api/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        const { command, target } = JSON.parse(body);
        let execCommand = '';

        // Mapeo de comandos seguros para tu entorno local en C:\Users\astur\Desktop\
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
            // Solo letras, números, guiones, puntos y espacios (evita inyección de comandos)
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
  console.log(`API endpoints: /api/health, /api/chat, /api/execute`);
});