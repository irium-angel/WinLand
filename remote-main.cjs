'use strict';
// Your phone as a remote, over your own Wi-Fi only (no server, no account): a small web page served by WinLand on
// this PC's local address. Off until you turn it on (Téléphone page). Every call needs the secret key that the QR code
// carries; a new key cuts every phone off. What the phone sees and does goes through the island (remote-ui.js).
const { app, ipcMain, BrowserWindow } = require('electron');
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORT = 47824;
const island = () => BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL()));
const fromIsland = e => /mascot\.html/.test(e.senderFrame?.url || '');
const keyFile = () => path.join(app.getPath('userData'), 'remote.json');
let key = ''; try { key = JSON.parse(fs.readFileSync(keyFile(), 'utf8')).key || ''; } catch {}
const newKey = () => { key = crypto.randomBytes(16).toString('hex'); try { fs.writeFileSync(keyFile(), JSON.stringify({ key })); } catch {} };
if (!/^[0-9a-f]{32}$/.test(key)) newKey();
let server = null, state = {}, error = '';

// this PC's address on your Wi-Fi or cable (192.168.x.x first, then 10.x.x.x, 172.16-31.x.x), never the virtual cards
// of WSL, Hyper-V, VirtualBox, VMware or a VPN, which phones cannot reach
function lanAddress() {
  const virtual = /vEthernet|WSL|Hyper-V|VirtualBox|VMware|Loopback|Bluetooth|Tailscale|ZeroTier|VPN|TAP|Npcap/i;
  const all = Object.entries(os.networkInterfaces()).flatMap(([name, list]) => (list || []).map(a => ({ ...a, name })))
    .filter(a => a.family === 'IPv4' && !a.internal && !/^169\.254\./.test(a.address));
  const rank = a => (virtual.test(a.name) || /^192.168.56./.test(a.address) ? 10 : 0) + (/^192\.168\./.test(a.address) ? 0 : /^10\./.test(a.address) ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(a.address) ? 2 : 5);
  return all.sort((a, b) => rank(a) - rank(b))[0]?.address || '';
}
const page = fs.readFileSync(path.join(__dirname, 'remote-phone.html'), 'utf8');
const okKey = req => {
  const given = Buffer.from(String(req.headers['x-winland-key'] || '')), want = Buffer.from(key);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
};
function start() {
  if (server) return;
  server = http.createServer((req, res) => {
    const url = String(req.url).split('?')[0];
    const head = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
    if (req.method === 'GET' && (url === '/' || url === '/index.html')) { // the page itself holds no secret: the key is in the QR code's link (#k=…)
      res.writeHead(200, { ...head, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src data:" });
      return res.end(page);
    }
    if (!url.startsWith('/api/') || !okKey(req)) { res.writeHead(403, head); req.resume(); return res.end(); }
    if (req.method === 'GET' && url === '/api/state') { res.writeHead(200, { ...head, 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: true, ...state, at: Date.now() })); }
    if (req.method === 'POST' && url === '/api/do') {
      let body = ''; req.setEncoding('utf8');
      req.on('data', c => { body += c; if (body.length > 2000) req.destroy(); });
      req.on('end', () => {
        let action = null; try { action = JSON.parse(body); } catch {}
        const kinds = ['allow', 'deny', 'play', 'pause', 'next', 'previous', 'focus', 'mic', 'mode'];
        if (action && kinds.includes(action.kind)) island()?.webContents.send('remote:do', { kind: action.kind, sessionId: String(action.sessionId || ''), value: String(action.value || '') });
        res.writeHead(200, { ...head, 'Content-Type': 'application/json' }); res.end('{"ok":true}');
      });
      return;
    }
    res.writeHead(404, head); res.end();
  });
  server.on('error', e => { error = e.code === 'EADDRINUSE' ? `Port ${PORT} déjà pris` : e.message; server = null; });
  server.listen(PORT, '0.0.0.0', () => { error = ''; });
}
function stop() { try { server?.close(); server?.closeAllConnections?.(); } catch {} server = null; } // a phone still connected is cut off too
const info = () => ({ ok: true, on: Boolean(server), error, url: lanAddress() ? `http://${lanAddress()}:${PORT}/#k=${key}` : '', address: lanAddress() });
ipcMain.handle('remote:set', (e, req) => { if (!fromIsland(e)) return null; if (req?.on) start(); else stop(); return new Promise(r => setTimeout(() => r(info()), 300)); });
ipcMain.handle('remote:info', e => fromIsland(e) ? info() : null);
ipcMain.handle('remote:new-key', e => { if (!fromIsland(e)) return null; newKey(); return info(); }); // every phone has to scan again
ipcMain.on('remote:state', (e, s) => { if (fromIsland(e) && s && typeof s === 'object') state = s; });
app.on('before-quit', stop);
