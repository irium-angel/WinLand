'use strict';
// Your phone as a remote, over your own Wi-Fi only (no server, no account): a small web page served by WinLand on
// this PC's local address. Off until you turn it on (Téléphone page).
// Pairing: the QR code only opens the page; the page asks for the 6-digit code shown in the island. The code changes
// every 5 minutes and after each phone paired, and 5 wrong codes lock pairing for a moment. A paired phone keeps its
// own secret (only its fingerprint is kept here); "Déconnecter les téléphones" forgets them all.
// Two modes on the phone: the remote (Claude, music, focus, microphone) and the Stream Deck (deck-main.cjs).
const { app, ipcMain, BrowserWindow } = require('electron');
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const deck = require('./deck-main.cjs');

const PORT = 47824, CODE_LIFE = 5 * 60000, MAX_TRIES = 5, LOCK_MS = 30000;
const island = () => BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL()));
const fromIsland = e => /mascot\.html/.test(e.senderFrame?.url || '');
const storeFile = () => path.join(app.getPath('userData'), 'remote.json');
const hash = token => crypto.createHash('sha256').update(String(token)).digest('hex');

// ---------- paired phones ----------
let devices = [];
try { devices = (JSON.parse(fs.readFileSync(storeFile(), 'utf8')).devices || []).filter(d => /^[0-9a-f]{64}$/.test(d?.hash || '')); } catch {}
const saveDevices = () => { try { fs.writeFileSync(storeFile(), JSON.stringify({ devices })); } catch {} };
function deviceOf(req) {
  const given = String(req.headers['x-winland-token'] || ''); if (!/^[0-9a-f]{64}$/.test(given)) return null;
  const h = Buffer.from(hash(given));
  return devices.find(d => crypto.timingSafeEqual(Buffer.from(d.hash), h)) || null;
}

// ---------- the pairing code ----------
let code = '', codeAt = 0, tries = 0, lockedUntil = 0;
const newCode = () => { code = String(crypto.randomInt(0, 1000000)).padStart(6, '0'); codeAt = Date.now(); tries = 0; };
const freshCode = () => { if (!code || Date.now() - codeAt > CODE_LIFE) newCode(); return code; };

// this PC's address on your Wi-Fi or cable (192.168.x.x first, then 10.x.x.x, 172.16-31.x.x), never the virtual cards
// of WSL, Hyper-V, VirtualBox, VMware or a VPN, which phones cannot reach
function lanAddress() {
  const virtual = /vEthernet|WSL|Hyper-V|VirtualBox|VMware|Loopback|Bluetooth|Tailscale|ZeroTier|VPN|TAP|Npcap/i;
  const all = Object.entries(os.networkInterfaces()).flatMap(([name, list]) => (list || []).map(a => ({ ...a, name })))
    .filter(a => a.family === 'IPv4' && !a.internal && !/^169\.254\./.test(a.address));
  const rank = a => (virtual.test(a.name) || /^192\.168\.56\./.test(a.address) ? 10 : 0) + (/^192\.168\./.test(a.address) ? 0 : /^10\./.test(a.address) ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(a.address) ? 2 : 5);
  return all.sort((a, b) => rank(a) - rank(b))[0]?.address || '';
}

// ---------- the server ----------
const page = () => fs.readFileSync(path.join(__dirname, 'remote-phone.html'), 'utf8');
const icons = fs.readFileSync(path.join(__dirname, 'deck-icons.js'), 'utf8');
const appIcon = fs.readFileSync(path.join(__dirname, 'assets', 'icon-256.png'));
const MANIFEST = JSON.stringify({ name: 'WinLand', short_name: 'WinLand', start_url: '/', scope: '/', display: 'standalone', background_color: '#0b0b0f', theme_color: '#0b0b0f', icons: [{ src: '/icon.png', sizes: '256x256', type: 'image/png', purpose: 'any' }] });
let server = null, state = {}, error = '', visit = null; // visit: the last device that reached the page (is the network letting phones through?)
const HEAD = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const json = (res, status, body) => { res.writeHead(status, { ...HEAD, 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
const readBody = req => new Promise(done => {
  let body = ''; req.setEncoding('utf8');
  req.on('data', c => { body += c; if (body.length > 4000) { req.destroy(); done(null); } });
  req.on('end', () => { try { done(JSON.parse(body || '{}')); } catch { done(null); } });
  req.on('error', () => done(null));
});
function start() {
  if (server) return;
  newCode();
  server = http.createServer(async (req, res) => {
    const url = String(req.url).split('?')[0];
    const from = String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');
    if (from && from !== '127.0.0.1' && from !== '::1') { const first = !visit || visit.ip !== from; visit = { ip: from, at: Date.now() }; if (first) island()?.webContents.send('remote:changed'); }
    if (req.method === 'GET' && (url === '/' || url === '/index.html')) { // the page itself holds no secret
      res.writeHead(200, { ...HEAD, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src data: blob: 'self'; manifest-src 'self'" });
      return res.end(page());
    }
    // "Add to Home Screen": it opens like an app, full screen, with WinLand's icon
    if (req.method === 'GET' && url === '/manifest.webmanifest') { res.writeHead(200, { ...HEAD, 'Content-Type': 'application/manifest+json' }); return res.end(MANIFEST); }
    if (req.method === 'GET' && url === '/icon.png') { res.writeHead(200, { ...HEAD, 'Cache-Control': 'max-age=86400', 'Content-Type': 'image/png' }); return res.end(appIcon); }
    if (req.method === 'GET' && url === '/icons.js') { res.writeHead(200, { ...HEAD, 'Content-Type': 'text/javascript; charset=utf-8' }); return res.end(icons); }
    if (req.method === 'POST' && url === '/api/pair') {
      const body = await readBody(req), now = Date.now();
      if (now < lockedUntil) return json(res, 429, { ok: false, error: 'locked', wait: Math.ceil((lockedUntil - now) / 1000) });
      const given = String(body?.code || '').replace(/\D/g, '');
      if (given.length !== 6 || given !== freshCode()) {
        if (++tries >= MAX_TRIES) { lockedUntil = now + LOCK_MS; newCode(); island()?.webContents.send('remote:changed'); return json(res, 403, { ok: false, error: 'code', left: 0 }); } // guessing: a new code, and a pause
        return json(res, 403, { ok: false, error: 'code', left: MAX_TRIES - tries });
      }
      const token = crypto.randomBytes(32).toString('hex');
      devices.push({ id: crypto.randomBytes(4).toString('hex'), name: String(body?.name || 'Téléphone').replace(/[^\w\s\-'.À-ÿ]/g, '').slice(0, 40) || 'Téléphone', hash: hash(token), at: now, seen: now });
      devices = devices.slice(-10); saveDevices(); newCode(); // a code works once
      island()?.webContents.send('remote:changed');
      return json(res, 200, { ok: true, token, pc: os.hostname() }); // the phone shows which PC it is now connected to
    }
    if (!url.startsWith('/api/')) { res.writeHead(404, HEAD); return res.end(); }
    const device = deviceOf(req);
    if (!device) { req.resume(); return json(res, 403, { ok: false, error: 'pair' }); }
    if (Date.now() - device.seen > 60000) { device.seen = Date.now(); saveDevices(); }
    if (req.method === 'GET' && url === '/api/state') return json(res, 200, { ok: true, ...state, at: Date.now() });
    if (req.method === 'GET' && url === '/api/cover') { if (!cover) { res.writeHead(404, HEAD); return res.end(); } res.writeHead(200, { ...HEAD, 'Content-Type': cover.type }); return res.end(cover.data); }
    if (req.method === 'GET' && url === '/api/deck') { // the phone says which version it has: the logos are sent again only after a change
      const d = deck.phoneDeck(), has = new URLSearchParams(String(req.url).split('?')[1] || '').get('rev');
      return json(res, 200, has !== null && Number(has) === d.rev ? { ok: true, same: true } : { ok: true, deck: d });
    }
    if (req.method === 'POST' && url === '/api/do') { // the remote's own buttons
      const action = await readBody(req);
      const kinds = ['allow', 'deny', 'play', 'pause', 'next', 'previous', 'seek', 'focus', 'mic', 'mode'];
      if (action && kinds.includes(action.kind)) island()?.webContents.send('remote:do', { kind: action.kind, sessionId: String(action.sessionId || ''), value: String(action.value || '') });
      return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url === '/api/press') { // a Stream Deck button: only its place, what it does is decided here
      const body = await readBody(req);
      const r = await Promise.resolve(deck.press(body?.page, body?.index)).catch(() => ({ ok: false }));
      return json(res, 200, { ok: Boolean(r?.ok) });
    }
    if (req.method === 'POST' && url === '/api/forget') { devices = devices.filter(d => d !== device); saveDevices(); island()?.webContents.send('remote:changed'); return json(res, 200, { ok: true }); }
    res.writeHead(404, HEAD); res.end();
  });
  server.on('error', e => { error = e.code === 'EADDRINUSE' ? `Port ${PORT} déjà pris` : e.message; server = null; });
  server.listen(PORT, '0.0.0.0', () => { error = ''; });
}
function stop() { try { server?.close(); server?.closeAllConnections?.(); } catch {} server = null; code = ''; visit = null; } // a phone still connected is cut off too
const info = () => {
  const on = Boolean(server), address = lanAddress(), now = Date.now();
  if (on) freshCode();
  return { ok: true, on, error, address, url: on && address ? `http://${address}:${PORT}/` : '', code: on ? code : '', codeLeft: on ? Math.max(0, CODE_LIFE - (now - codeAt)) : 0,
    lockedFor: Math.max(0, lockedUntil - now), port: PORT, visit, devices: devices.map(d => ({ id: d.id, name: d.name, seen: d.seen })) };
};
ipcMain.handle('remote:set', (e, req) => { if (!fromIsland(e)) return null; if (req?.on) start(); else stop(); return new Promise(r => setTimeout(() => r(info()), 300)); });
ipcMain.handle('remote:info', e => fromIsland(e) ? info() : null);
ipcMain.handle('remote:new-code', e => { if (!fromIsland(e)) return null; if (server) newCode(); return info(); });
ipcMain.handle('remote:forget', (e, id) => { if (!fromIsland(e)) return null; devices = id ? devices.filter(d => d.id !== id) : []; saveDevices(); return info(); }); // every phone has to pair again
ipcMain.on('remote:state', (e, s) => { if (fromIsland(e) && s && typeof s === 'object') state = s; });
let cover = null; // the album cover of the song playing, for the phone's player
ipcMain.on('remote:cover', (e, url) => { if (!fromIsland(e)) return; const m = /^data:(image\/(?:png|jpe?g|webp|bmp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(url || '')); cover = m && m[2].length < 4000000 ? { type: m[1], data: Buffer.from(m[2], 'base64') } : null; });
app.on('before-quit', stop);
