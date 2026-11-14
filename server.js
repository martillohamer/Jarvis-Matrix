// =============================================================================
// JARVIS-Matrix — servidor local (Node 20+, ESM, SIN dependencias externas)
//
//   Arranque normal : node --env-file=.env server.js
//   Modo pruebas    : $env:JARVIS_DRY_RUN='1'; node --env-file=.env server.js
//                     (registra lo que haría, pero NO abre, apaga ni borra nada)
//
// Variables (.env):
//   OPENAI_API_KEY     clave de FreeLLMAPI (obligatoria)
//   JARVIS_TOKEN       token para acceso fuera de tu red (túnel / móvil fuera de casa)
//   FREELLM_URL        por defecto http://127.0.0.1:3001
//   JARVIS_ALLOWED_HOSTS  dominios extra permitidos (p. ej. el del túnel), separados por comas
// =============================================================================
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  existsSync, statSync, readdirSync, unlinkSync, appendFileSync, statfsSync, createReadStream,
} from 'node:fs';
import { spawn, execFile } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';

// ----------------------------- Configuración ---------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.JARVIS_PORT) || 3002;
const HOST = process.env.JARVIS_HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const FREELLM_URL = (process.env.FREELLM_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
const API_KEY = process.env.OPENAI_API_KEY || process.env.FREELLMAPI_API_KEY || '';
const JARVIS_TOKEN = process.env.JARVIS_TOKEN || '';
const DRY_RUN = process.env.JARVIS_DRY_RUN === '1';
const EXTRA_HOSTS = (process.env.JARVIS_ALLOWED_HOSTS || '')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

const TZ = 'Europe/Madrid';
const CITY = process.env.WEATHER_CITY || 'Oviedo';
const LAT = process.env.WEATHER_LAT || '43.36';
const LON = process.env.WEATHER_LON || '-5.85';

const HOME = process.env.USERPROFILE || os.homedir();
const DESKTOP = path.join(HOME, 'Desktop');
const SEARVGA_DIR = process.env.SEARVGA_DIR || path.join(DESKTOP, 'searxng-nextgen');
const OPENMONTAGE_DIR = process.env.OPENMONTAGE_DIR || path.join(DESKTOP, 'OpenMontage');
const MAINT_SCRIPT = process.env.MAINT_SCRIPT || path.join(DESKTOP, 'Dev-Maintenance-Windows.ps1');
const FOLDERS = {
  descargas: path.join(HOME, 'Downloads'),
  documentos: path.join(HOME, 'Documents'),
  proyectos: process.env.PROJECTS_DIR || 'D:\\mis proyecto & repos',
  repositorios: process.env.PROJECTS_DIR || 'D:\\mis proyecto & repos',
};
const LOG_FILE = path.join(__dirname, 'commands.log'); // ignorado por git

// ----------------------------- Registro --------------------------------------
const ts = () => new Date().toLocaleString('sv-SE', { timeZone: TZ });
const log = (tag, msg) => console.log(`[${ts()}] [JARVIS-${tag}] ${msg}`);
const audit = (msg) => { try { appendFileSync(LOG_FILE, `[${ts()}] ${msg}\n`); } catch { /* sin log */ } };

if (!API_KEY) {
  console.error('[JARVIS-CRITICAL] Falta OPENAI_API_KEY (la clave de FreeLLMAPI).');
  console.error('  1) Ponla en el archivo .env  (OPENAI_API_KEY=...)');
  console.error('  2) Arranca con:  node --env-file=.env server.js');
  process.exit(1);
}
if (!existsSync(PUBLIC_DIR)) {
  console.error(`[JARVIS-CRITICAL] No existe la carpeta del frontend: ${PUBLIC_DIR}`);
  console.error('  Mueve index.html y assets/ dentro de public/.');
  process.exit(1);
}

// ----------------------------- Seguridad -------------------------------------
function clientIsLocal(req) {
  const h = req.headers;
  if (h['cf-connecting-ip'] || h['cf-ray'] || h['x-forwarded-for'] || h['x-real-ip']) return false;
  const ip = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  return (
    ip === '127.0.0.1' || ip === '::1' ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(ip) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(ip)
  );
}

function tokenOk(req) {
  const t = req.headers['x-jarvis-token'];
  if (!JARVIS_TOKEN || typeof t !== 'string') return false;
  const a = Buffer.from(t);
  const b = Buffer.from(JARVIS_TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

const authorized = (req) => clientIsLocal(req) || tokenOk(req);

function hostAllowed(hostHeader) {
  if (!hostHeader) return false;
  const h = hostHeader.toLowerCase().replace(/:\d+$/, '');
  if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]') return true;
  if (/^[a-z0-9-]+\.local$/.test(h)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return EXTRA_HOSTS.includes(h);
}

function originOk(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try { return new URL(o).host.toLowerCase() === (req.headers.host || '').toLowerCase(); } catch { return false; }
}

// ----------------------------- Utilidades HTTP -------------------------------
function sendJSON(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(obj));
}

function readBody(req, max = 1_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > max) { reject(Object.assign(new Error('Petición demasiado grande'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readJSON(req) {
  const raw = await readBody(req);
  try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error('JSON inválido'), { status: 400 }); }
}

// ----------------------------- Ejecución de acciones -------------------------
function runDetached(cmd, args, opts = {}) {
  if (DRY_RUN) { log('DRY', `${cmd} ${args.join(' ')}`); audit(`DRY ${cmd} ${args.join(' ')}`); return; }
  try {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore', ...opts });
    child.on('error', (e) => log('ERROR', `${cmd}: ${e.message}`));
    child.unref();
  } catch (e) { log('ERROR', `${cmd}: ${e.message}`); }
}
const openTarget = (t) => runDetached('rundll32', ['url.dll,FileProtocolHandler', t]);
const openFolder = (p) => runDetached('explorer.exe', [p]);
const startSearvga = () => {
  runDetached('cmd.exe', ['/c', 'start', '', 'Iniciar_SearVGA.bat'], { cwd: SEARVGA_DIR, windowsHide: true });
  setTimeout(() => openTarget('http://localhost:8889'), 4000);
};

// ----------------------------- Información real ------------------------------
let freellmJitterCount = 0;
let freellmLastState = true;

function cpuThreadsSnapshot() {
  return os.cpus().map((c) => ({
    idle: c.times.idle,
    total: c.times.user + c.times.nice + c.times.sys + c.times.idle + c.times.irq,
  }));
}

async function cpuStats() {
  const a = cpuThreadsSnapshot();
  await new Promise((r) => setTimeout(r, 400));
  const b = cpuThreadsSnapshot();
  const threads = b.map((curr, i) => {
    const prev = a[i];
    const dt = curr.total - prev.total;
    return dt > 0 ? Math.round(100 * (1 - (curr.idle - prev.idle) / dt)) : 0;
  });
  const totalDt = b.reduce((s, c) => s + c.total, 0) - a.reduce((s, c) => s + c.total, 0);
  const totalIdle = b.reduce((s, c) => s + c.idle, 0) - a.reduce((s, c) => s + c.idle, 0);
  return { total: totalDt > 0 ? Math.round(100 * (1 - totalIdle / totalDt)) : 0, threads };
}

function dateTime() {
  const now = new Date();
  const f = (o) => new Intl.DateTimeFormat('es-ES', { timeZone: TZ, ...o }).format(now);
  const hora = f({ hour: '2-digit', minute: '2-digit', hour12: false });
  return { hora, fecha: f({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) };
}

const WMO = {
  0: 'cielo despejado', 1: 'mayormente despejado', 2: 'parcialmente nublado', 3: 'cielo cubierto',
  45: 'niebla', 48: 'niebla con escarcha', 51: 'llovizna ligera', 53: 'llovizna', 55: 'llovizna intensa',
  61: 'lluvia ligera', 63: 'lluvia', 65: 'lluvia fuerte', 71: 'nieve ligera', 73: 'nieve', 75: 'nieve fuerte',
  80: 'chubascos ligeros', 81: 'chubascos', 82: 'chubascos fuertes', 95: 'tormenta',
  96: 'tormenta con granizo', 99: 'tormenta fuerte con granizo',
};

async function weatherReply() {
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code`
    + '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max'
    + `&timezone=${encodeURIComponent(TZ)}&forecast_days=1`;
  const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  const t = d?.current?.temperature_2m;
  if (typeof t !== 'number') throw new Error('Respuesta sin datos');
  const desc = WMO[d.current.weather_code] ?? 'tiempo variable';
  const max = d?.daily?.temperature_2m_max?.[0];
  const min = d?.daily?.temperature_2m_min?.[0];
  const rain = d?.daily?.precipitation_probability_max?.[0];
  let reply = `En ${CITY} hay ${Math.round(t)} grados, con ${desc}.`;
  if (typeof max === 'number' && typeof min === 'number') reply += ` Hoy la mínima es de ${Math.round(min)} y la máxima de ${Math.round(max)}.`;
  if (typeof rain === 'number') reply += ` Probabilidad de lluvia: ${rain} por ciento.`;
  return reply;
}

function diskInfo() {
  try {
    const root = process.platform === 'win32' ? `${process.env.SystemDrive || 'C:'}\\` : '/';
    const s = statfsSync(root);
    return { diskFree: s.bavail * s.bsize, diskTotal: s.blocks * s.bsize };
  } catch { return { diskFree: 0, diskTotal: 0 }; }
}
async function probeUrl(url, ms = 800) {
  try { await fetch(url, { signal: AbortSignal.timeout(ms) }); return true; } catch { return false; }
}

async function probeFreeLLM(ms = 4000) {
  try {
    const r = await fetch(`${FREELLM_URL}/v1/models`, {
      headers: { Authorization: `Bearer ${API_KEY.trim()}` },
      signal: AbortSignal.timeout(ms),
    });
    const online = r.ok || r.status === 200 || r.status === 401 || r.status === 403;
    const out = { online, reachable: true, status: r.status };
    if (!r.ok && (r.status === 401 || r.status === 403)) {
      out.hint = 'La pasarela responde pero requiere validación de clave';
    }
    return out;
  } catch (e) {
    return { online: false, reachable: false, code: e.cause?.code || e.name, error: `No se puede conectar con FreeLLMAPI en ${FREELLM_URL}` };
  }
}

async function getSystemStatus() {
  const [stats, llm, searvga] = await Promise.all([cpuStats(), probeFreeLLM(1000), probeUrl('http://127.0.0.1:8889/')]);
  
  if (llm.online !== freellmLastState) {
    if (!llm.online) freellmJitterCount += 1;
    freellmLastState = llm.online;
  }

  const mem = os.totalmem();
  const disks = diskInfo();
  return {
    cpu: stats.total,
    cpuThreads: stats.threads,
    cpuCores: stats.threads.length,
    ramUsed: Math.round(100 * (1 - os.freemem() / mem)),
    ...disks,
    diskPct: disks.diskTotal > 0 ? Math.round(100 * (1 - disks.diskFree / disks.diskTotal)) : 0,
    freellmJitter: freellmJitterCount,
    services: [
      { name: 'FreeLLMAPI', port: 3001, up: llm.online },
      { name: 'JARVIS', port: PORT, up: true },
      { name: 'SearVGA', port: 8889, up: searvga },
    ],
  };
}

// ----------------------------- Mantenimiento ---------------------------------
function runMaintenance() {
  if (DRY_RUN) { log('DRY', 'mantenimiento: flushdns + borrar temporales >24 h'); return 'Modo de pruebas: no he borrado nada.'; }
  execFile('ipconfig', ['/flushdns'], { windowsHide: true }, () => {});
  const dir = process.env.TEMP || os.tmpdir();
  const limit = Date.now() - 24 * 3600 * 1000;
  let n = 0; let bytes = 0;
  for (const f of readdirSync(dir)) {
    try {
      const p = path.join(dir, f);
      const s = statSync(p);
      if (s.isFile() && s.mtimeMs < limit) { unlinkSync(p); n += 1; bytes += s.size; }
    } catch { /* en uso o sin permiso: se omite */ }
  }
  return `Hecho. He vaciado la caché DNS y borrado ${n} archivos temporales antiguos, unos ${Math.round(bytes / 1048576)} megas.`;
}

// ----------------------------- Motor de órdenes ------------------------------
function normalize(text) {
  return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/^(?:oye |hey |ok )?(?:jarvis|yarbis|yervis|jervis|llarvis) /, '')
    .replace(/ (?:por favor|gracias)$/, '').trim();
}

const SITE_HOME = {
  youtube: 'https://www.youtube.com', netflix: 'https://www.netflix.com/browse',
  disney: 'https://www.disneyplus.com', spotify: 'spotify:',
};
const SITE_SEARCH = {
  spotify: (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}`,
  youtube: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  disney: (q) => `https://www.disneyplus.com/search/${encodeURIComponent(q)}`,
};
const site = (s) => (s.startsWith('disney') ? 'disney' : s);
const SITE_NAME = { spotify: 'Spotify', youtube: 'YouTube', disney: 'Disney Plus', netflix: 'Netflix' };

let pending = null;
const askConfirm = (type) => { pending = { type, expires: Date.now() + 20000 }; };

async function handleSingleCommand(raw) {
  const n = normalize(raw);
  if (!n) return { handled: false };
  if (pending && Date.now() >= pending.expires) pending = null;
  let m;

  if (pending) {
    const typed = n.match(/^(?:si|confirmo) (apaga|apagalo|limpia)$/);
    const typedType = typed ? (typed[1] === 'limpia' ? 'maintenance' : 'shutdown') : null;
    const yes = /^(?:si|vale|confirmo|confirmado|adelante|hazlo|dale)$/.test(n) || typedType === pending.type;
    const no = /^(?:no|cancela|cancelar|olvidalo|mejor no|para)$/.test(n);
    if (yes) {
      const { type } = pending; pending = null;
      if (type === 'shutdown') {
        runDetached('shutdown', ['/s', '/t', '30'], { windowsHide: true });
        return { handled: true, risk: 'red', reply: 'Apagando el equipo en 30 segundos. Di «cancela el apagado» si quieres detenerlo.' };
      }
      return { handled: true, risk: 'red', reply: runMaintenance() };
    }
    if (no) { pending = null; return { handled: true, reply: 'De acuerdo, lo dejo como estaba.' }; }
  }

  if (/^(?:cancela|cancelar|anula|anular|deten|detener)\b.*\bapagado\b/.test(n)) {
    pending = null;
    runDetached('shutdown', ['/a'], { windowsHide: true });
    return { handled: true, risk: 'red', reply: 'Apagado cancelado.' };
  }
  if (/^(?:puedes |podrias )?(?:apaga|apagar|apagame)\b.*\b(?:pc|ordenador|equipo|computadora|portatil)\b/.test(n)) {
    askConfirm('shutdown');
    return { handled: true, risk: 'red', reply: '¿Seguro que quieres apagar el equipo? Di «sí» en los próximos 20 segundos para confirmar.' };
  }

  if (/^(?:limpia|limpiar|optimiza|optimizar)(?: el)? (?:sistema|pc|ordenador|equipo|temporales|archivos temporales)$|^limpia la basura$|^flush ?dns$|^vacia la cache dns$/.test(n)) {
    askConfirm('maintenance');
    return { handled: true, risk: 'red', reply: 'Voy a vaciar la caché DNS y borrar los archivos temporales de tu usuario con más de un día. ¿Confirmas? Di «sí» en los próximos 20 segundos.' };
  }

  if (/^(?:dime )?(?:la )?hora(?: actual)?$|^que hora (?:es|son|tenemos)(?: ahora| actual)?$/.test(n)) {
    const { hora } = dateTime();
    return { handled: true, reply: `${Number(hora.split(':')[0]) === 1 ? 'Es la' : 'Son las'} ${hora}.` };
  }
  if (/^(?:que )?dia (?:es|estamos)(?: hoy)?$|^en que dia estamos$|^a que dia estamos$|^(?:que )?fecha (?:es|tenemos)(?: hoy)?$|^dime la fecha$|^fecha de hoy$/.test(n)) {
    return { handled: true, reply: `Hoy es ${dateTime().fecha}.` };
  }

  if (/^(?:que )?(?:tiempo|clima) (?:hace|hay|hara)(?: hoy| ahora| en oviedo)?$|^(?:el )?clima(?: de hoy| en oviedo)?$|^va a llover(?: hoy)?$|^que temperatura (?:hay|hace)(?: hoy| ahora)?$|^como esta el tiempo$|^prevision del tiempo$/.test(n)) {
    try { return { handled: true, reply: await weatherReply() }; } catch (e) {
      log('ERROR', `Clima: ${e.message}`);
      return { handled: true, reply: 'No he podido consultar el tiempo ahora mismo. Inténtalo de nuevo en unos minutos.' };
    }
  }

  if (/^(?:estado del (?:sistema|equipo|pc|ordenador)|como esta el (?:equipo|pc|ordenador)|telemetria|uso de (?:ram|cpu|memoria)|monitoreo(?: del sistema)?)$/.test(n)) {
    const s = await getSystemStatus();
    const gb = (b) => Math.round(b / 1073741824);
    const llm = s.services.find((x) => x.name === 'FreeLLMAPI')?.up ? 'conectada' : 'desconectada';
    return { handled: true, reply: `Procesador al ${s.cpu} por ciento, memoria al ${s.ramUsed} por ciento, disco con ${gb(s.diskFree)} gigas libres de ${gb(s.diskTotal)}. La pasarela de IA está ${llm}.` };
  }

  if (/^(?:lee|leeme|leer|revisa|mira|limpia|borra|elimina|tengo|hay)\b.*\b(?:correos?|emails?|mails?|bandeja de entrada)\b|^(?:limpia|borra|elimina)\b.*\b(?:spam|propaganda)\b/.test(n)) {
    return { handled: true, reply: 'Gmail todavía no está conectado, así que no puedo leer ni limpiar tu correo. Cuando lo conectemos con permisos de solo lectura, te aviso.' };
  }

  if (/^(?:(?:abre|abrir|inicia|iniciar|arranca|lanza|ejecuta) (?:el )?)?(?:navegador privado|searvga|buscador privado)$/.test(n)) {
    startSearvga();
    return { handled: true, reply: 'Iniciando SearVGA. Abriré el buscador privado en unos segundos.' };
  }

  m = n.match(/^(?:pon|ponme|busca|buscame|reproduce) (.{1,100}?) en (spotify|youtube|disney(?: plus)?)$/);
  if (m) {
    const s = site(m[2]);
    openTarget(SITE_SEARCH[s](m[1]));
    return { handled: true, reply: `Buscando ${m[1]} en ${SITE_NAME[s]}.` };
  }
  m = n.match(/^(?:busca|buscame) en (spotify|youtube|disney(?: plus)?) (.{1,100})$/);
  if (m) {
    const s = site(m[1]);
    openTarget(SITE_SEARCH[s](m[2]));
    return { handled: true, reply: `Buscando ${m[2]} en ${SITE_NAME[s]}.` };
  }

  m = n.match(/^(?:abre|abrir|abreme|ponme|pon) (?:el |la )?(youtube|netflix|disney(?: plus)?|spotify)$/);
  if (m) {
    const s = site(m[1]);
    openTarget(SITE_HOME[s]);
    return { handled: true, reply: `Abriendo ${SITE_NAME[s]}.` };
  }
  m = n.match(/^(?:abre|abrir|abreme) (?:mis |mi |la carpeta de |la carpeta )?(descargas|documentos|proyectos|repositorios)$/);
  if (m) {
    openFolder(FOLDERS[m[1]]);
    return { handled: true, reply: `Abriendo ${m[1]}.` };
  }

  if (/^(?:inicia|iniciar|arranca|lanza|ejecuta) (?:el |la |pipeline de )?(?:openmontage|video|edicion|montaje)$/.test(n)) {
    runDetached('cmd.exe', ['/c', 'npm', 'run', 'dev'], { cwd: OPENMONTAGE_DIR, windowsHide: true });
    return { handled: true, reply: 'Iniciando el pipeline de vídeo OpenMontage.' };
  }
  if (/^(?:reinicia|reiniciar|arranca|arrancar) (?:el |los )?(?:docker|contenedor|servicios|freellmapi)$/.test(n)) {
    runDetached('docker', ['restart', 'freellmapi-opencode'], { windowsHide: true });
    return { handled: true, reply: 'Solicitado el reinicio del servicio FreeLLMAPI en Docker.' };
  }
  if (/^(?:optimiza|optimizar) (?:la )?red$|^flush ?dns$|^vacia la cache dns$/.test(n)) {
    execFile('ipconfig', ['/flushdns'], { windowsHide: true }, () => {});
    return { handled: true, reply: 'Optimizando la red y vaciando la caché DNS.' };
  }
  if (/^(?:abre|abrir) (?:los |mis )?(?:proyectos|repositorios|repos)$/.test(n)) {
    openFolder(FOLDERS.proyectos);
    return { handled: true, reply: 'Abriendo tu carpeta de proyectos.' };
  }

  return { handled: false };
}

async function handleCommand(raw) {
  const parts = raw.split(/\s*(?:,| y | luego | despues | a continuacion | y tambien )\s*/i).filter((p) => p.trim().length > 2);
  if (parts.length <= 1) return handleSingleCommand(raw);

  const results = [];
  for (const part of parts) {
    const res = await handleSingleCommand(part);
    if (res.handled) results.push(res);
  }

  if (results.length === 0) return { handled: false };
  return { handled: true, reply: results.map((r) => r.reply).join(' Además, ') };
}

// ----------------------------- API -------------------------------------------
const GATEWAY_DOWN = 'Señor, la pasarela de IA no está disponible ahora mismo, pero los sistemas locales operan con normalidad.';
const assistantMsg = (content, extra = {}) => ({ choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }], ...extra });
const NET_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'TimeoutError', 'UND_ERR_CONNECT_TIMEOUT', 'EHOSTUNREACH']);

async function handleChat(req, res) {
  const body = await readJSON(req);
  if (!Array.isArray(body.messages) || body.messages.length === 0) return sendJSON(res, 400, { error: 'Falta messages' });
  
  const targetModel = body.model && body.model !== '?' && body.model.trim() !== '' ? body.model : 'freellmapi/auto';
  const payload = { ...body, model: targetModel, stream: false };
  
  const cleanApiKey = API_KEY.trim();
  const t0 = Date.now();
  let upstream;
  
  try {
    upstream = await fetch(`${FREELLM_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${cleanApiKey}` 
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(90000),
    });
  } catch (e) {
    const code = e.cause?.code || e.name;
    log('ERROR', `FreeLLMAPI no responde (${code})`);
    if (NET_CODES.has(code)) return sendJSON(res, 200, assistantMsg(GATEWAY_DOWN, { _degraded: true, _cause: code }));
    return sendJSON(res, 502, { error: 'Error de proxy', details: e.message, code });
  }

  const text = await upstream.text();
  let data;
  try { 
    data = JSON.parse(text); 
  } catch { 
    return sendJSON(res, 502, { error: 'Respuesta no válida de FreeLLMAPI', status: upstream.status }); 
  }

  const via = data?._routed_via;
  log('AI', `${via?.platform || 'freellmapi'} / ${via?.model || data?.model || targetModel} · ${((Date.now() - t0) / 1000).toFixed(1)} s · HTTP ${upstream.status}`);
  
  if (upstream.ok) return sendJSON(res, 200, data);

  const why = upstream.status === 401 || upstream.status === 403 ? 'rechazó la clave unificada; verifica OPENAI_API_KEY en .env'
    : upstream.status === 429 ? 'indica cuota agotada o saturación temporal'
      : `devolvió el error ${upstream.status}`;
      
  return sendJSON(res, 200, assistantMsg(`Señor, la pasarela de IA ${why}.`, { _degraded: true, _upstream_status: upstream.status }));
}

async function handleExecute(req, res) {
  if (!clientIsLocal(req)) return sendJSON(res, 403, { error: 'Solo desde este equipo o la red local' });
  const { command, target } = await readJSON(req);
  switch (command) {
    case 'launch-openmontage':
      runDetached('cmd.exe', ['/c', 'npm', 'run', 'dev'], { cwd: OPENMONTAGE_DIR, windowsHide: true });
      break;
    case 'launch-searxng':
      startSearvga();
      break;
    case 'run-maintenance':
      runDetached('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', MAINT_SCRIPT], { windowsHide: true });
      break;
    case 'optimize-network':
    case 'flush-dns':
      execFile('ipconfig', ['/flushdns'], { windowsHide: true }, () => {});
      break;
    case 'docker-restart':
      runDetached('docker', ['restart', 'freellmapi-opencode'], { windowsHide: true });
      break;
    case 'open-folder': {
      const clean = typeof target === 'string' && /^[\w\-. ]+$/.test(target) && !target.includes('..') ? target : 'Jarvis-Matrix';
      openFolder(path.join(DESKTOP, clean));
      break;
    }
    default:
      return sendJSON(res, 400, { success: false, error: 'Comando no reconocido' });
  }
  audit(`EXECUTE ${command}`);
  return sendJSON(res, 200, { success: true, command, message: `Ejecutado: ${command}` });
}

async function handleAPI(req, res, pathname) {
  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJSON(res, 200, { ...(await probeFreeLLM()), dryRun: DRY_RUN, gateway: FREELLM_URL });
  }
  if (pathname === '/api/system-status' && req.method === 'GET') {
    return sendJSON(res, 200, await getSystemStatus());
  }
  if (pathname === '/api/command' && req.method === 'POST') {
    const { text } = await readJSON(req);
    if (typeof text !== 'string' || !text.trim() || text.length > 500) return sendJSON(res, 400, { error: 'Texto no válido' });
    const result = await handleCommand(text);
    if (result.handled) { log('CMD', `${result.risk || 'ok'} · ${text.slice(0, 80)}`); audit(`CMD [${result.risk || 'ok'}] "${text.slice(0, 120)}" -> ${result.reply.slice(0, 80)}`); }
    return sendJSON(res, 200, { handled: result.handled, ...(result.handled ? { reply: result.reply } : {}) });
  }
  if (pathname === '/api/chat' && req.method === 'POST') return handleChat(req, res);
  if (pathname === '/api/execute' && req.method === 'POST') return handleExecute(req, res);
  if (pathname.startsWith('/api/gmail/')) {
    try {
        return sendJSON(res, 501, { error: 'Gmail todavía no está conectado (requiere OAuth con permisos de solo lectura).' });
    } catch (e) {
        log('ERROR', `Gmail endpoint error: ${e.message}`);
        return sendJSON(res, 500, { error: 'Error interno en endpoint Gmail' });
    }
  }
  return sendJSON(res, 404, { error: 'Not found' });
}

// ----------------------------- Archivos estáticos ----------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.gif': 'image/gif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

function serveStatic(req, res, pathname) {
  const plain = (code, msg) => { res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(msg); };
  if (req.method !== 'GET' && req.method !== 'HEAD') return plain(405, 'Método no permitido');
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { return plain(400, 'Petición incorrecta'); }
  if (rel.includes('\0') || rel.split(/[\\/]/).some((seg) => seg.startsWith('.'))) return plain(404, '404 Not Found');
  const filePath = path.resolve(PUBLIC_DIR, `.${rel.endsWith('/') ? `${rel}index.html` : rel}`);
  const relPath = path.relative(PUBLIC_DIR, filePath);
  if (relPath.startsWith('..') || path.isAbsolute(relPath)) return plain(404, '404 Not Found');
  let st;
  try { st = statSync(filePath); } catch { return plain(404, '404 Not Found'); }
  if (!st.isFile()) return plain(404, '404 Not Found');

  const size = st.size;
  let start = 0; let end = size - 1; let status = 200;
  const rg = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (rg && (rg[1] || rg[2])) {
    if (rg[1] === '') start = Math.max(0, size - Number(rg[2]));
    else { start = Number(rg[1]); if (rg[2] !== '') end = Math.min(end, Number(rg[2])); }
    if (start > end || start >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); return res.end(); }
    status = 206;
  }
  const headers = {
    'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Content-Length': end - start + 1,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  };
  if (status === 206) headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
  res.writeHead(status, headers);
  if (req.method === 'HEAD') return res.end();
  createReadStream(filePath, { start, end }).on('error', () => res.destroy()).pipe(res);
  return undefined;
}

// ----------------------------- Servidor --------------------------------------
const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (!hostAllowed(req.headers.host)) { res.writeHead(403, { 'Content-Type': 'text/plain' }); return res.end('Host no permitido'); }
    if (pathname.startsWith('/api/')) {
      if (req.method === 'OPTIONS') { res.writeHead(204, { Allow: 'GET, POST, OPTIONS' }); return res.end(); }
      if (!originOk(req)) return sendJSON(res, 403, { error: 'Origen no permitido' });
      if (!authorized(req)) return sendJSON(res, 403, { error: 'Forbidden' });
      return await handleAPI(req, res, pathname);
    }
    if (!clientIsLocal(req)) { res.writeHead(403, { 'Content-Type': 'text/plain' }); return res.end('Forbidden'); }
    return serveStatic(req, res, pathname);
  } catch (e) {
    log('ERROR', e.stack || e.message);
    if (!res.headersSent) return sendJSON(res, e.status || 500, { error: e.message });
    return res.end();
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`[JARVIS-CRITICAL] El puerto ${PORT} ya está en uso. Cierra el otro servidor (Get-NetTCPConnection -LocalPort ${PORT}).`);
  else console.error('[JARVIS-CRITICAL] Error del servidor:', err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  log('SUCCESS', `Servidor JARVIS-Matrix escuchando en http://localhost:${PORT}`);
  log('INFO', `Frontend: ${PUBLIC_DIR}`);
  if (DRY_RUN) log('INFO', 'MODO PRUEBAS (JARVIS_DRY_RUN=1): no se ejecuta ninguna acción real.');
  if (!JARVIS_TOKEN) log('INFO', 'Sin JARVIS_TOKEN: el acceso desde fuera de tu red (túnel/móvil) queda BLOQUEADO.');
  probeFreeLLM(2500).then((r) => {
    if (r.online) log('SUCCESS', `FreeLLMAPI conectado en ${FREELLM_URL}`);
    else log('ERROR', `FreeLLMAPI NO responde en ${FREELLM_URL} (${r.hint || r.error || `HTTP ${r.status}`}${r.code ? `, ${r.code}` : ''})`);
  });
});

process.on('uncaughtException', (err) => { console.error('[JARVIS-CRITICAL] Uncaught Exception:', err); audit(`UNCAUGHT ${err.message}`); });
process.on('unhandledRejection', (reason) => { console.error('[JARVIS-CRITICAL] Unhandled Rejection:', reason); audit(`REJECTION ${reason}`); });