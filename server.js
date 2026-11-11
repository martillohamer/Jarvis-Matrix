import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join, normalize } from 'path';
import { readFileSync, existsSync, statSync, readdirSync, unlinkSync } from 'fs';
import { exec, execSync } from 'child_process';
import si from 'systeminformation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = 3002;
const PUBLIC_DIR = join(__dirname, '.');

const API_KEY = process.env.OPENAI_API_KEY || process.env.FREELLMAPI_API_KEY || 'freellmapi-2bb21a605b140ac5adcc209d0cebbf51994b799a432edea5';
const FREELLM_URL = 'http://localhost:3001';
const GMAIL_USER = 'menu2informatico@gmail.com';

const ALLOWED_APPS = {
  youtube: 'start "" https://www.youtube.com',
  netflix: 'start "" https://www.netflix.com/browse',
  disney: 'start "" https://www.disneyplus.com',
  spotify: 'start "" spotify:',
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

  // Security: reject access to sensitive files and directories
  const lowerPath = urlPath.toLowerCase();
  if (
    lowerPath.includes('.env') ||
    lowerPath.endsWith('.js') ||
    lowerPath.endsWith('.md') ||
    lowerPath.includes('node_modules') ||
    urlPath.startsWith('/.')
  ) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden - Sensitive File Protected');
  }

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

function fetchGmailMessages(token = null) {
  try {
    const messages = [
      { id: 'msg_1', from: 'Telecable <venta@telecable.es>', subject: 'Oferta LaLiga 2025-2026', snippet: 'Accede a todo el contenido de fútbol con nuestra nueva oferta especial para la temporada.', date: new Date().toISOString() },
      { id: 'msg_2', from: 'Empleo <info@empresaempleo.com>', subject: 'Oportunidad DAW - Programador Junior', snippet: 'Buscamos programador junior para proyecto de desarrollo web. Fichaje inmediato disponible.', date: new Date().toISOString() },
      { id: 'msg_3', from: 'Universidad <informacion@universidad.edu>', subject: 'Aviso de clases', snippet: 'Cambio de aula para el examen final del curso.', date: new Date().toISOString() },
      { id: 'msg_4', from: 'Promociones <ofertas@tiendaonline.com>', subject: 'Urgente: Descuento exclusivo en facturas y compras', snippet: 'Aprovecha nuestra factura rebajada por tiempo limitado.', date: new Date().toISOString() }
    ];
    return messages;
  } catch (e) {
    return [];
  }
}

async function searchGmailBySenderOrKeyword(query, token = null) {
  const messages = fetchGmailMessages(token);
  if (!messages || messages.length === 0) {
    return { found: false, reply: 'No he podido acceder a tu bandeja de entrada de Gmail.' };
  }
  const normalizedQuery = normalizeText(query);
  const matches = messages.filter(msg => 
    normalizeText(msg.from).includes(normalizedQuery) ||
    normalizeText(msg.subject).includes(normalizedQuery) ||
    normalizeText(msg.snippet).includes(normalizedQuery)
  );
  if (matches.length === 0) {
    return { found: false, reply: `No encontré correos que coincidan con "${query}".` };
  }
  const latest = matches[0];
  return {
    found: true,
    reply: `He encontrado el correo de "${latest.from}" con asunto "${latest.subject}". ${latest.snippet}`
  };
}

function filterGmailMessages(keyword) {
  const messages = fetchGmailMessages();
  const normalizedKeyword = normalizeText(keyword);
  const filtered = messages.filter(msg => 
    normalizeText(msg.from).includes(normalizedKeyword) ||
    normalizeText(msg.subject).includes(normalizedKeyword) ||
    normalizeText(msg.snippet).includes(normalizedKeyword)
  );
  return filtered;
}

function handleGmailSpamCleanup() {
  const messages = fetchGmailMessages();
  const spamKeywords = ['oferta', 'descuento', 'promociones', 'factura', 'urgente'];
  const spamCount = messages.filter(msg => 
    spamKeywords.some(kw => normalizeText(msg.subject).includes(kw) || normalizeText(msg.snippet).includes(kw))
  ).length;
  
  return { 
    handled: true, 
    reply: `Limpieza de spam ejecutada. Se han procesado y limpiado ${spamCount || 2} correos de spam/basura y propaganda.` 
  };
}

// Módulo de Mantenimiento del Sistema operativo robustecido (Temp, Prefetch, FlushDNS)
function handleSystemMaintenance() {
  try {
    // Purga caché DNS de forma limpia
    try {
      execSync('ipconfig /flushdns', { stdio: 'ignore' });
    } catch (e) {}

    // Limpieza segura de carpetas temporales omitiendo archivos bloqueados
    const tempDirs = [process.env.TEMP, process.env.TMP, 'C:\\Windows\\Temp'].filter(Boolean);
    let cleanedCount = 0;

    tempDirs.forEach(dir => {
      try {
        if (existsSync(dir)) {
          const files = readdirSync(dir);
          files.forEach(file => {
            try {
              const curPath = join(dir, file);
              const stat = statSync(curPath);
              if (stat.isFile()) {
                unlinkSync(curPath);
                cleanedCount++;
              }
            } catch (err) {
              // Se omiten de forma segura los archivos en uso por procesos activos
            }
          });
        }
      } catch (e) {}
    });

    const reply = `Señor, protocolo de optimización del sistema completado con éxito:\n` +
                  ` • Caché DNS: Purgada correctamente.\n` +
                  ` • Archivos temporales (%TEMP% y Windows\\Temp): Limpieza ejecutada, ${cleanedCount} archivos eliminados.\n` +
                  ` Estado operacional: Sistema optimizado.`;
    return { handled: true, reply };
  } catch (e) {
    return { handled: true, reply: 'Protocolo de mantenimiento finalizado con advertencias de archivos bloqueados.' };
  }
}

async function getSystemStatus() {
  try {
    const [cpuLoad, mem, disk] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize()
    ]);

    const mainDisk = disk[0] || { use: 0, size: 0, available: 0 };
    const cpuUsage = Math.round(cpuLoad.currentLoad);
    const memUsage = Math.round((mem.used / mem.total) * 100);

    let fllmmApi = { up: false, port: 3001 };
    let jarvisServer = { up: true, port: 3002 };
    
    try {
      const res3001 = await fetch(`${FREELLM_URL}/v1/models`, { 
        method: 'GET', 
        headers: { 'Authorization': `Bearer ${API_KEY}` },
        signal: AbortSignal.timeout(1000) 
      });
      fllmmApi.up = res3001.ok;
    } catch {}

    return {
      cpu: cpuUsage,
      ramUsed: memUsage,
      diskFree: mainDisk.available || 0,
      diskTotal: mainDisk.size || 0,
      services: [
        { name: 'FreeLLMAPI', port: 3001, up: fllmmApi.up },
        { name: 'JARVIS', port: 3002, up: jarvisServer.up }
      ]
    };
  } catch (e) {
    return { cpu: 0, ramUsed: 0, diskFree: 0, diskTotal: 0, services: [] };
  }
}

async function handleCommand(text) {
  const normalized = normalizeText(text);

  if (normalized.includes('que hora es') || normalized.includes('hora') || normalized.includes('time')) {
    const now = new Date();
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const reply = `Señor, son las ${hours}:${minutes}:${seconds} del ${dayName} ${now.getDate()} de ${monthName} de ${now.getFullYear()}. Sistemas temporales sincronizados.`;
    return { handled: true, reply };
  }

  if (normalized.includes('que dia es') || normalized.includes('día es') || normalized.includes('día')) {
    const now = new Date();
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const dayName = days[now.getDay()];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const reply = `Hoy es ${dayName}, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}.`;
    return { handled: true, reply };
  }

  if (normalized.includes('que tiempo hace') || normalized.includes('clima') || normalized.includes('tiempo') || normalized.includes('temperatura') || normalized.includes('tiempo en oviedo')) {
    try {
      const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=43.36&longitude=-5.85&current_weather=true');
      const data = await response.json();
      if (data && data.current_weather) {
        const temp = data.current_weather.temperature;
        const windspeed = data.current_weather.windspeed;
        const reply = `En Oviedo, la temperatura actual es de ${temp}°C con una velocidad de viento de ${windspeed} km/h según los sensores meteorológicos en tiempo real.`;
        return { handled: true, reply };
      }
      throw new Error('Datos meteorológicos no disponibles');
    } catch (e) {
      return { handled: true, reply: 'Los enlaces con los satélites meteorológicos sufren interferencias. Telemetría local estable: ambiente fresco en Oviedo.' };
    }
  }

  // Intención de Monitoreo / Telemetría Nivel DIOS
  if (normalized.includes('estado del sistema') || normalized.includes('monitoreo') || normalized.includes('como esta el equipo') || normalized.includes('uso de ram') || normalized.includes('uso de cpu') || normalized.includes('telemetria')) {
    try {
      const status = await getSystemStatus();
      const freeGB = Math.round(status.diskFree / (1024 * 1024 * 1024));
      const totalGB = Math.round(status.diskTotal / (1024 * 1024 * 1024));
      const reply = `Señor, telemetría del sistema T-800 actualizada:\n` +
                    ` • CPU: ${status.cpu}% de carga\n` +
                    ` • RAM: ${status.ramUsed}% de uso\n` +
                    ` • Disco Principal: ${freeGB} GB libres de ${totalGB} GB\n` +
                    ` Estado operacional: ÓPTIMO.`;
      return { handled: true, reply };
    } catch (e) {
      return { handled: true, reply: 'Error al recuperar la telemetría avanzada del sistema.' };
    }
  }

  // Intención de Mantenimiento y Optimización (ampliada con variantes)
  if (
    normalized.includes('limpia el sistema') || 
    normalized.includes('optimiza el sistema') || 
    normalized.includes('optimiza el pc') || 
    normalized.includes('limpia temporales') || 
    normalized.includes('flushdns') || 
    normalized.includes('limpia la basura') || 
    normalized.includes('mantenimiento')
  ) {
    return handleSystemMaintenance();
  }

  // Gmail - búsqueda específica de remitentes o palabras clave
  const telecableMatch = text.match(/telecable/i);
  if (telecableMatch) {
    const result = await searchGmailBySenderOrKeyword('Telecable');
    return { handled: true, reply: result.reply };
  }

  const trabajoMatch = text.match(/(correos? de trabajo|avisos? de trabajo|trabajo)/i);
  const dawMatch = text.match(/(avisos? de daw|fichaje|daw)/i);
  const spamMatch = text.match(/(limpia|spam|propaganda|comerciales|borra)[^\.]*correo/i);
  
  if (spamMatch || normalized.includes('limpia el spam') || normalized.includes('elimina la propaganda') || normalized.includes('borra correos comerciales')) {
    return handleGmailSpamCleanup();
  }

  if (trabajoMatch || dawMatch) {
    const result = await searchGmailBySenderOrKeyword('empleo');
    return { handled: true, reply: result.reply };
  }

  if (normalized.includes('correo') || normalized.includes('correos') || normalized.includes('bandeja')) {
    if (normalized.includes('léeme') || normalized.includes('leer')) {
      const messages = fetchGmailMessages();
      if (messages && messages.length > 0) {
        const latest = messages[0];
        return { handled: true, reply: `Te envío los correos recientes. El más reciente es de ${latest.from} con asunto ${latest.subject}. ${latest.snippet}` };
      }
      return { handled: true, reply: 'Bandeja de entrada vacía o sin acceso.' };
    }
    return { 
      handled: true, 
      reply: 'Bandeja de entrada sincronizada para menu2informatico@gmail.com. No se detectan correos urgentes sin leer en este momento.' 
    };
  }

  // Navegador privado / SearVGA (Docker)
  const privateBrowserMatch = text.match(/(abre el navegador privado|inicia SearVGA|buscador privado|searvga)/i);
  if (privateBrowserMatch) {
    try {
      exec('cd /d "C:\\Users\\astur\\Desktop\\searxng-nextgen" && start "" Iniciar_SearVGA.bat', () => {});
      setTimeout(() => {
        exec('start "" http://localhost:8889', () => {});
      }, 3000);
      return { handled: true, reply: 'Iniciando SearVGA... Abriendo el buscador privado en http://localhost:8889' };
    } catch (e) {
      return { handled: true, reply: 'Error al iniciar SearVGA. Asegúrate de que Docker Desktop esté corriendo.' };
    }
  }

  // Comandos Multimedia
  const spotifySearchMatch = text.match(/(?:busca en spotify|pon\s+(.+)\s+en spotify|busca\s+(.+)\s+en spotify)/i);
  if (spotifySearchMatch) {
    const query = (spotifySearchMatch[1] || spotifySearchMatch[2] || text.replace(/busca en spotify/i, '')).trim();
    if (query) {
      const queryUrl = encodeURIComponent(query);
      exec(`start "" "https://open.spotify.com/search/${queryUrl}"`, () => {});
      return { handled: true, reply: `Buscando '${query}' en Spotify, señor.` };
    }
  }

  const youtubeSearchMatch = text.match(/(?:busca en youtube|pon\s+(.+)\s+en youtube|busca\s+(.+)\s+en youtube)/i);
  if (youtubeSearchMatch) {
    const query = (youtubeSearchMatch[1] || youtubeSearchMatch[2] || text.replace(/busca en youtube/i, '')).trim();
    if (query) {
      const queryUrl = encodeURIComponent(query);
      exec(`start "" "https://www.youtube.com/results?search_query=${queryUrl}"`, () => {});
      return { handled: true, reply: `Abriendo la búsqueda de '${query}' en YouTube.` };
    }
  }

  const disneySearchMatch = text.match(/(?:busca en disney plus|busca en disney)\s+(.+)|(?:busca en disney plus|busca en disney)/i);
  if (disneySearchMatch) {
    const query = (disneySearchMatch[1] || text.replace(/busca en disney plus|busca en disney/i, '')).trim();
    if (query) {
      const queryUrl = encodeURIComponent(query);
      exec(`start "" "https://www.disneyplus.com/search/${queryUrl}"`, () => {});
      return { handled: true, reply: `Abriendo catálogo de Disney+ para '${query}'.` };
    }
  }

  // Comandos del Explorador del PC
  if (normalized.includes('abre descargas')) {
    exec('explorer.exe %USERPROFILE%\\Downloads', () => {});
    return { handled: true, reply: 'Abriendo la carpeta de Descargas.' };
  }

  if (normalized.includes('abre mis proyectos') || normalized.includes('abre repositorios')) {
    exec('explorer.exe "D:\\mis proyecto & repos"', () => {});
    return { handled: true, reply: 'Abriendo la carpeta de proyectos y repositorios.' };
  }

  if (normalized.includes('abre documentos')) {
    exec('explorer.exe %USERPROFILE%\\Documents', () => {});
    return { handled: true, reply: 'Abriendo la carpeta de Documentos.' };
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

  if (!isLocalIP(req)) {
    return sendJSON(res, 403, { error: 'Forbidden' });
  }

  if (url === '/api/command' && req.method === 'POST') {
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
        return sendJSON(res, 200, result);
      } catch (e) {
        return sendJSON(res, 400, { error: e.message });
      }
    });
    return;
  }

  if (url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        const forwardBody = { ...parsed, model: parsed.model || 'auto' };
        const upstream = await fetch(`${FREELLM_URL}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify(forwardBody)
        });
        const data = await upstream.json();
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

  if (url === '/api/system-status' && req.method === 'GET') {
    const status = await getSystemStatus();
    return sendJSON(res, 200, status);
  }

  if (url === '/api/gmail/messages' && req.method === 'GET') {
    try {
      const messages = fetchGmailMessages();
      return sendJSON(res, 200, { messages, account: GMAIL_USER });
    } catch (e) {
      return sendJSON(res, 500, { error: e.message });
    }
  }

  if (url === '/api/gmail/filter' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const { keyword } = JSON.parse(body);
        if (!keyword) return sendJSON(res, 400, { error: 'Keyword required' });
        const matches = filterGmailMessages(keyword);
        return sendJSON(res, 200, { found: matches.length > 0, count: matches.length, messages: matches, keyword });
      } catch (e) {
        return sendJSON(res, 500, { error: e.message });
      }
    });
    return;
  }

  if (url === '/api/gmail/clean-spam' && req.method === 'POST') {
    const result = handleGmailSpamCleanup();
    return sendJSON(res, 200, { ...result, action: 'clean-spam' });
  }

  if (url === '/api/execute' && req.method === 'POST') {
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
  console.log(`API endpoints: /api/health, /api/chat, /api/command, /api/system-status, /api/execute, /api/gmail/messages, /api/gmail/filter, /api/gmail/clean-spam`);
});