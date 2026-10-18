// Contact form endpoint: receives POST /api/contact and forwards it to a Telegram chat.
// No dependencies; needs Node 18+ (global fetch).
const http = require('node:http');

const PORT = Number(process.env.PORT) || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MAX_PER_HOUR = Number(process.env.MAX_PER_HOUR) || 5;
const MAX_BODY = 10_000;

const LIMITS = { name: 80, reply: 120, topic: 80, message: 2000 };

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set');
  process.exit(1);
}

// ip -> timestamps of recent messages
const hits = new Map();

function rateLimited(ip) {
  const hourAgo = Date.now() - 3600_000;
  const recent = (hits.get(ip) || []).filter(t => t > hourAgo);
  if (recent.length >= MAX_PER_HOUR) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(Date.now());
  hits.set(ip, recent);
  return false;
}

setInterval(() => {
  const hourAgo = Date.now() - 3600_000;
  for (const [ip, times] of hits) {
    if (!times.some(t => t > hourAgo)) hits.delete(ip);
  }
}, 600_000).unref();

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function clientIp(req) {
  // Caddy sets X-Forwarded-For; the first entry is the visitor.
  const fwd = req.headers['x-forwarded-for'];
  return (fwd ? fwd.split(',')[0] : req.socket.remoteAddress || '').trim();
}

function clean(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

async function sendTelegram(text) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Plain text (no parse_mode) so visitor input can't inject formatting.
    body: JSON.stringify({ chat_id: CHAT_ID, text, disable_web_page_preview: true }),
  });
  if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`);
}

async function handleContact(req, res) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) return send(res, 413, { error: 'too_large' });
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return send(res, 400, { error: 'bad_json' });
  }

  // Honeypot: bots fill the hidden "website" field. Pretend success.
  if (data.website) return send(res, 200, { ok: true });

  const name = clean(data.name, LIMITS.name);
  const reply = clean(data.reply, LIMITS.reply);
  const topic = clean(data.topic, LIMITS.topic) || 'כללי';
  const message = clean(data.message, LIMITS.message);
  if (!name || !message) return send(res, 400, { error: 'missing_fields' });

  if (rateLimited(clientIp(req))) return send(res, 429, { error: 'rate_limited' });

  const text = [
    '📬 הודעה חדשה מ-jacob-apps.co.il',
    `נושא: ${topic}`,
    `שם: ${name}`,
    `לחזור אל: ${reply || 'לא צוין'}`,
    '',
    message,
  ].join('\n');

  try {
    await sendTelegram(text);
    send(res, 200, { ok: true });
  } catch (err) {
    console.error(err.message);
    send(res, 502, { error: 'send_failed' });
  }
}

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/contact') {
    handleContact(req, res).catch(err => {
      console.error(err);
      send(res, 500, { error: 'server_error' });
    });
  } else if (req.method === 'GET' && req.url === '/api/health') {
    send(res, 200, { ok: true });
  } else {
    send(res, 404, { error: 'not_found' });
  }
}).listen(PORT, () => console.log(`contact listening on ${PORT}`));
