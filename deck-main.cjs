'use strict';
// Stream Deck: the phone remote (remote-main.cjs) becomes a grid of buttons, like an Elgato Stream Deck. You make the
// buttons on the PC, in their own window (deck-editor.html): a label, an icon, a colour and what it does. The phone
// only gets the labels, icons and colours, and only says "button 3 of page 1": what a button does is decided and
// done here, on this PC, never sent by the phone. Kept in deck.json, next to WinLand's other files.
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const file = () => path.join(app.getPath('userData'), 'deck.json');
const island = () => BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL()));
const fromIsland = e => /mascot\.html/.test(e.senderFrame?.url || '');

// ---------- the deck ----------
const KINDS = ['media', 'volume', 'mic', 'app', 'script', 'url', 'open', 'keys', 'text', 'mode', 'focus', 'timer', 'screenshot', 'lock', 'claude', 'page'];
const COLOURS = ['#2c2c2e', '#0a84ff', '#30d158', '#ff9f0a', '#ff453a', '#bf5af2', '#ff375f', '#64d2ff', '#ffd60a', '#d97757', '#5e5ce6', '#8e8e93'];
const b = (label, icon, colour, action) => ({ label, icon, colour, action });
const DEFAULT = {
  cols: 4, rows: 3,
  pages: [{ name: 'Principal', buttons: [
    b('Précédent', 'prev', '#2c2c2e', { kind: 'media', op: 'prev' }), b('Lecture', 'playpause', '#30d158', { kind: 'media', op: 'playpause' }), b('Suivant', 'next', '#2c2c2e', { kind: 'media', op: 'next' }), b('Micro', 'mic-off', '#ff453a', { kind: 'mic' }),
    b('Son −', 'volume-down', '#2c2c2e', { kind: 'volume', op: 'down' }), b('Son +', 'volume-up', '#2c2c2e', { kind: 'volume', op: 'up' }), b('Muet', 'volume-mute', '#2c2c2e', { kind: 'volume', op: 'mute' }), b('Capture', 'screenshot', '#0a84ff', { kind: 'screenshot' }),
    b('Focus', 'focus', '#bf5af2', { kind: 'focus' }), b('Réunion', 'users', '#5e5ce6', { kind: 'mode', mode: 'meeting' }), b('Normal', 'home', '#2c2c2e', { kind: 'mode', mode: 'normal' }), b('Verrouiller', 'lock', '#8e8e93', { kind: 'lock' })
  ] }]
};
// only what a button can hold: anything else in the file is dropped
const str = (v, max) => String(v ?? '').slice(0, max);
function cleanAction(a) {
  if (!a || !KINDS.includes(a.kind)) return null;
  const out = { kind: a.kind };
  for (const [k, max] of [['op', 20], ['value', 10], ['name', 200], ['url', 2000], ['path', 1000], ['keys', 80], ['text', 4000], ['mode', 20], ['minutes', 6], ['label', 80], ['prompt', 4000], ['project', 1000], ['page', 3]]) if (a[k] != null && a[k] !== '') out[k] = str(a[k], max);
  return out;
}
function clean(deck) {
  const cols = Math.max(2, Math.min(6, Number(deck?.cols) || 4)), rows = Math.max(1, Math.min(5, Number(deck?.rows) || 3));
  const pages = (Array.isArray(deck?.pages) ? deck.pages : []).slice(0, 12).map((p, i) => ({
    name: str(p?.name || `Page ${i + 1}`, 30),
    buttons: Array.from({ length: cols * rows }, (_, j) => { const x = p?.buttons?.[j]; return x && x.action ? { label: str(x.label, 30), icon: str(x.icon, 30), colour: COLOURS.includes(x.colour) || /^#[0-9a-f]{6}$/i.test(x.colour || '') ? x.colour : COLOURS[0], action: cleanAction(x.action),
      ...(typeof x.image === 'string' && x.image.length < 90000 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(x.image) ? { image: x.image } : {}) } : null; }) // image: the app's own logo
  }));
  return { cols, rows, rev: Number(deck?.rev) || 0, pages: pages.length ? pages : clean(DEFAULT).pages };
}
let deck = null;
function getDeck() { if (!deck) { try { deck = clean(JSON.parse(fs.readFileSync(file(), 'utf8'))); } catch { deck = clean(DEFAULT); } } return deck; }
// rev: the phone downloads the deck (and its logos) again only when it changed
function setDeck(next) { deck = clean({ ...next, rev: (getDeck().rev || 0) + 1 }); try { fs.writeFileSync(file(), JSON.stringify(deck)); } catch {} return deck; }
// what the phone sees: never the links, paths, texts or keys behind the buttons
const phoneDeck = () => { const d = getDeck(); return { rev: d.rev, cols: d.cols, rows: d.rows, pages: d.pages.map(p => ({ name: p.name, buttons: p.buttons.map(x => x && { label: x.label, icon: x.icon, colour: x.colour, image: x.image || '', go: x.action?.kind === 'page' ? Number(x.action.page) || 0 : null }) })) }; };

// ---------- doing what a button says ----------
const helper = line => app.winlandHelper?.(line);
const toIsland = action => island()?.webContents.send('remote:do', { kind: 'deck', action });
async function run(a) {
  a = cleanAction(a); if (!a) return { ok: false, error: 'action' };
  switch (a.kind) {
    case 'media': return { ok: Boolean(helper('keys ' + ({ playpause: 'playpause', next: 'nexttrack', prev: 'prevtrack' }[a.op] || 'playpause'))) };
    case 'volume': {
      const now = app.winlandVolumeNow?.() || { level: 50, muted: false };
      if (a.op === 'mute') return { ok: Boolean(helper('mute ' + (now.muted ? 0 : 1))) };
      const level = a.op === 'set' ? Number(a.value) : now.level + (a.op === 'down' ? -1 : 1) * (Number(a.value) || 5);
      return { ok: Boolean(helper('set ' + Math.max(0, Math.min(100, Math.round(level || 0))))) };
    }
    case 'keys': return /^[a-z0-9]+(\+[a-z0-9]+)*$/i.test(a.keys || '') ? { ok: Boolean(helper('keys ' + a.keys.toLowerCase())) } : { ok: false, error: 'keys' };
    case 'text': return a.text ? { ok: Boolean(helper('type ' + Buffer.from(a.text, 'utf8').toString('base64'))) } : { ok: false };
    case 'app': return app.winlandLaunch ? await app.winlandLaunch.open('apps', a.name || '') : { ok: false };
    case 'script': return app.winlandLaunch ? await app.winlandLaunch.open('scripts', a.name || '') : { ok: false };
    case 'url': {
      const url = String(a.url || '').trim();
      if (!/^[a-z][a-z0-9+.-]*:/i.test(url) || /^(file|javascript|vbscript|data):/i.test(url)) return { ok: false, error: 'url' }; // web links and app links (spotify:, ms-settings:…)
      await shell.openExternal(url); return { ok: true };
    }
    case 'open': { const p = String(a.path || ''); if (!path.isAbsolute(p) || !fs.existsSync(p)) return { ok: false, error: 'missing' }; const problem = await shell.openPath(p); return { ok: !problem }; }
    case 'screenshot': await shell.openExternal('ms-screenclip:'); return { ok: true };
    case 'lock': execFile('rundll32.exe', ['user32.dll,LockWorkStation'], { windowsHide: true }, () => {}); return { ok: true };
    case 'claude': return app.winlandQueueAdd ? app.winlandQueueAdd(a.prompt || '', a.project || app.winlandLaunch?.lists().projects[0]?.path || '') : { ok: false }; // no project chosen: the first one
    case 'page': return { ok: true }; // the phone turns the page itself
    default: toIsland(a); return { ok: true }; // mic, mode, focus, timer: the island does them (and shows them)
  }
}
const press = (page, index) => { const x = getDeck().pages[Number(page)]?.buttons?.[Number(index)]; return x?.action ? run(x.action) : { ok: false, error: 'empty' }; };

// ---------- the editor window ----------
let win = null, lang = 'fr';
function openEditor(language) {
  if (language) lang = language === 'en' ? 'en' : 'fr';
  if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); return; }
  win = new BrowserWindow({
    width: 1080, height: 720, minWidth: 860, minHeight: 600, show: false, title: 'WinLand Stream Deck', backgroundColor: '#0e0f11',
    icon: path.join(__dirname, 'assets', 'icon.ico'), titleBarStyle: 'hidden', titleBarOverlay: { color: '#0e0f11', symbolColor: '#e6e6ea', height: 44 },
    webPreferences: { preload: path.join(__dirname, 'deck-preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'deck-editor.html'), { query: { lang } });
  win.once('ready-to-show', () => { win.show(); win.focus(); });
  win.on('closed', () => { win = null; });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());
}
const fromEditor = e => win && !win.isDestroyed() && e.sender === win.webContents;
ipcMain.handle('deck:get', e => fromEditor(e) ? { ok: true, deck: getDeck(), colours: COLOURS } : null);
ipcMain.handle('deck:set', (e, next) => { if (!fromEditor(e)) return null; const d = setDeck(next); island()?.webContents.send('deck:changed'); return { ok: true, deck: d }; });
ipcMain.handle('deck:reset', e => fromEditor(e) ? { ok: true, deck: setDeck(DEFAULT) } : null);
ipcMain.handle('deck:lists', e => fromEditor(e) ? { ok: true, ...(app.winlandLaunch?.lists() || { apps: [], scripts: [], projects: [] }) } : null);
ipcMain.handle('deck:try', (e, action) => fromEditor(e) ? run(action) : null);
// the logo for a button: an app of the Start menu (by name) or a file or folder
ipcMain.handle('deck:logo', async (e, req) => {
  if (!fromEditor(e)) return null;
  const file = req?.kind === 'app' ? app.winlandLaunch?.pathOf('apps', String(req.name || '')) : String(req?.path || '');
  if (!file || !path.isAbsolute(file) || !fs.existsSync(file)) return { ok: false };
  const image = await app.winlandAppIcon?.(file).catch(() => '') || ''; return { ok: Boolean(image), image };
});
ipcMain.handle('deck:pick', async (e, req) => { // a file or a folder for "Open"
  if (!fromEditor(e)) return null;
  const r = await dialog.showOpenDialog(win, { properties: [req?.folder ? 'openDirectory' : 'openFile'] });
  return { ok: !r.canceled, path: r.filePaths?.[0] || '' };
});
ipcMain.handle('deck:scripts-folder', async e => { if (!fromEditor(e)) return null; const dir = path.join(app.getPath('userData'), 'scripts'); fs.mkdirSync(dir, { recursive: true }); await shell.openPath(dir); return { ok: true }; });
ipcMain.on('deck:open-editor', (e, language) => { if (fromIsland(e)) openEditor(language); });
app.on('before-quit', () => { try { win?.destroy(); } catch {} });

module.exports = { getDeck, phoneDeck, press, run };
