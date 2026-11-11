// Prueba de humo de JARVIS-Matrix.
// 1) Arranca el servidor EN MODO PRUEBAS (no ejecuta nada real):
//      $env:JARVIS_DRY_RUN='1'; node --env-file=.env server.js
// 2) En otra ventana:  node --env-file=.env smoke-test.js
import http from 'node:http';

const BASE = process.env.JARVIS_URL || 'http://localhost:3002';
const TOKEN = process.env.JARVIS_TOKEN || '';
const EXTERNAL = { 'x-forwarded-for': '8.8.8.8' }; // simula una petición que llega por el túnel

function call(method, p, { headers = {}, body } = {}) {
  return new Promise((resolve) => {
    const u = new URL(p, BASE);
    const r = http.request(
      { method, hostname: u.hostname, port: u.port, path: u.pathname + u.search, headers: { ...headers, ...(body ? { 'content-type': 'application/json' } : {}) } },
      (res) => { let d = ''; res.on('data', (c) => { d += c; }); res.on('end', () => resolve({ status: res.statusCode, text: d, headers: res.headers })); },
    );
    r.on('error', (e) => resolve({ status: 0, text: String(e), headers: {} }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}
const json = (r) => { try { return JSON.parse(r.text); } catch { return {}; } };
const cmd = async (text) => json(await call('POST', '/api/command', { body: { text } }));

let fails = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `   -> ${extra}`}`); if (!ok) fails += 1; };

const health = await call('GET', '/api/health');
if (health.status === 0) { console.error('No se puede conectar con el servidor. ¿Está arrancado?'); process.exit(2); }
if (json(health).dryRun !== true) {
  console.error('ABORTO: el servidor NO está en modo pruebas. Arráncalo con $env:JARVIS_DRY_RUN=\'1\' para no ejecutar acciones reales.');
  process.exit(2);
}

console.log('\n== Seguridad ==');
for (const f of ['/server.js', '/.env', '/README.md', '/package.json', '/commands.log', '/../server.js', '/%2e%2e/server.js']) {
  const r = await call('GET', f);
  check(`GET ${f} no se sirve`, r.status === 404 || r.status === 400, `status ${r.status}`);
}
check('GET / sirve la web', (await call('GET', '/')).status === 200);
const evilOrigin = await call('POST', '/api/command', { headers: { Origin: 'http://evil.com' }, body: { text: 'que hora es' } });
check('Origin ajeno -> 403', evilOrigin.status === 403, `status ${evilOrigin.status}`);
const evilHost = await call('GET', '/api/health', { headers: { Host: 'evil.com' } });
check('Host desconocido -> 403', evilHost.status === 403, `status ${evilHost.status}`);
const ext = await call('POST', '/api/command', { headers: EXTERNAL, body: { text: 'que hora es' } });
check('Petición por túnel sin token -> 403', ext.status === 403, `status ${ext.status}`);
check('/api/execute rechaza peticiones externas aunque lleven token', (await call('POST', '/api/execute', { headers: { ...EXTERNAL, 'x-jarvis-token': TOKEN || 'x' }, body: { command: 'open-folder' } })).status === 403);
const noCors = await call('GET', '/api/health');
check('La API no envía Access-Control-Allow-Origin', !noCors.headers['access-control-allow-origin'], noCors.headers['access-control-allow-origin']);
if (TOKEN) {
  const withTok = await call('POST', '/api/command', { headers: { ...EXTERNAL, 'x-jarvis-token': TOKEN }, body: { text: 'que hora es' } });
  check('Por túnel CON token correcto -> 200', withTok.status === 200, `status ${withTok.status}`);
  const badTok = await call('POST', '/api/command', { headers: { ...EXTERNAL, 'x-jarvis-token': `${TOKEN}x` }, body: { text: 'que hora es' } });
  check('Por túnel con token incorrecto -> 403', badTok.status === 403, `status ${badTok.status}`);
} else {
  console.log('SKIP  pruebas con token (define JARVIS_TOKEN en el entorno para activarlas)');
}

console.log('\n== Órdenes que SÍ deben activarse ==');
let r = await cmd('¿Qué hora es?');
check('hora', r.handled && /^(Son las|Es la) \d{2}:\d{2}\.$/.test(r.reply || ''), JSON.stringify(r));
r = await cmd('Jarvis, ¿qué día es hoy?');
check('fecha', r.handled && /^Hoy es /.test(r.reply || ''), JSON.stringify(r));
r = await cmd('¿Qué tiempo hace?');
check('clima (responde algo honesto)', r.handled && (r.reply || '').length > 10, JSON.stringify(r));
r = await cmd('pon Bad Bunny en Spotify');
check('buscar en Spotify', r.handled && /Spotify/.test(r.reply || ''), JSON.stringify(r));
r = await cmd('abre YouTube');
check('abrir YouTube', r.handled && /YouTube/.test(r.reply || ''), JSON.stringify(r));
r = await cmd('léeme los correos');
check('Gmail dice la verdad (no conectado)', r.handled && /todavía no está conectado/.test(r.reply || ''), JSON.stringify(r));

console.log('\n== Frases que NO deben secuestrarse (van a la IA) ==');
for (const t of [
  'ahora explícame los bucles en Java',
  'ayúdame con mi trabajo de Java',
  'estudio DAW, ¿me explicas los JOIN?',
  'necesito hacer mantenimiento de mi proyecto',
  '¿cuánto tiempo hace que existe Java?',
  '¿cómo se apaga un servidor Linux?',
  'explícame qué es el spam',
  'si quieres, seguimos con el tema de las clases',
]) {
  r = await cmd(t);
  check(`"${t}"`, r.handled === false, JSON.stringify(r));
}

console.log('\n== Apagado y mantenimiento con confirmación ==');
r = await cmd('sí, apaga');
check('"sí, apaga" SIN petición previa no hace nada', r.handled === false, JSON.stringify(r));
r = await cmd('apaga el pc');
check('"apaga el pc" pide confirmación', r.handled && /Seguro/.test(r.reply || ''), JSON.stringify(r));
r = await cmd('Sí, apaga.');
check('"Sí, apaga." (con coma y punto) confirma', r.handled && /30 segundos/.test(r.reply || ''), JSON.stringify(r));
r = await cmd('apaga el ordenador');
r = await cmd('no');
check('"no" cancela la confirmación', r.handled && /lo dejo como estaba/.test(r.reply || ''), JSON.stringify(r));
r = await cmd('cancela el apagado');
check('"cancela el apagado"', r.handled && /cancelado/.test(r.reply || ''), JSON.stringify(r));
r = await cmd('limpia el sistema');
check('"limpia el sistema" pide confirmación (no borra)', r.handled && /Confirmas/.test(r.reply || ''), JSON.stringify(r));
r = await cmd('sí');
check('"sí" ejecuta el mantenimiento (en modo pruebas no borra)', r.handled && /Modo de pruebas/.test(r.reply || ''), JSON.stringify(r));

console.log('\n== Pasarela de IA ==');
const chat = await call('POST', '/api/chat', { body: { messages: [{ role: 'user', content: 'hola' }] } });
check('/api/chat siempre devuelve algo legible (nunca burbuja vacía)', chat.status === 200 || chat.status === 502, `status ${chat.status}`);
if (chat.status === 200) check('trae un mensaje del asistente', !!json(chat)?.choices?.[0]?.message?.content, chat.text.slice(0, 120));
const badChat = await call('POST', '/api/chat', { body: { foo: 1 } });
check('/api/chat sin messages -> 400', badChat.status === 400, `status ${badChat.status}`);

console.log(`\n${fails === 0 ? 'TODO CORRECTO' : `${fails} PRUEBA(S) FALLIDA(S)`}`);
process.exit(fails === 0 ? 0 : 1);
