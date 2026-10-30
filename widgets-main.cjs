'use strict';
// Desktop widgets, like the ones on a Mac (main process).
// Each widget is a small window of its own, owned by the desktop: it sits on the wallpaper under your windows and
// stays when Win+D shows the desktop. While the place is unlocked you move them anywhere (they snap to an 8 px
// grid), then you lock it. Everything they show is on this PC: the clock, the Windows calendar, what plays, the
// battery, the processor, Claude Code (the island tells: widgets-ui.js), and your own notes and pictures.
const { app, BrowserWindow, ipcMain, Menu, screen, dialog, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { pathToFileURL, fileURLToPath } = require('node:url');

const SIZES = { s: [164, 164], m: [344, 164], l: [344, 344] };
const PAD = 28; // room around the card for its shadow (widget.html puts the card there)
const GRID = 8, GAP = 16;
const KINDS = { clock: ['s', 'm'], calendar: ['s', 'm', 'l'], music: ['s', 'm'], battery: ['s', 'm'], system: ['s', 'm'], claude: ['s', 'm'], note: ['s', 'm', 'l'], countdown: ['s', 'm'], custom: ['s', 'm', 'l'] };
const PICTURE = /^[a-f0-9]{24}\.(png|jpe?g|webp|gif)$/;
// a click on a widget opens its app, as on a Mac (fixed addresses only)
const OPENS = { clock: 'ms-clock:', calendar: 'outlookcal:', battery: 'ms-settings:batterysaver', system: 'taskmgr' };

const dataFile = () => path.join(app.getPath('userData'), 'widgets.json');
const pictures = () => path.join(app.getPath('userData'), 'widget-pictures');
const lang = () => app.winlandLang === 'en' ? 'en' : 'fr';
const say = (fr, en) => lang() === 'en' ? en : fr;

// ---------- what is saved: on, locked, and each widget (kind, size, place, its own words and picture) ----------
function clean(it) {
  if (!it || !KINDS[it.kind]) return null;
  const o = it.opts || {}, opts = {};
  if (typeof o.text === 'string') opts.text = o.text.slice(0, it.kind === 'note' ? 4000 : 300);
  if (typeof o.title === 'string') opts.title = o.title.slice(0, 60);
  if (typeof o.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.date)) opts.date = o.date;
  if (typeof o.colour === 'string' && /^#[0-9a-f]{6}$/i.test(o.colour)) opts.colour = o.colour;
  if (typeof o.image === 'string' && PICTURE.test(o.image)) opts.image = o.image;
  return {
    id: typeof it.id === 'string' && /^[a-z0-9-]{8,40}$/.test(it.id) ? it.id : crypto.randomUUID(),
    kind: it.kind, size: KINDS[it.kind].includes(it.size) ? it.size : KINDS[it.kind][0],
    x: Number.isFinite(it.x) ? Math.round(it.x) : 0, y: Number.isFinite(it.y) ? Math.round(it.y) : 0, opts
  };
}
let data = { on: true, locked: false, items: [] };
function load() {
  try {
    const d = JSON.parse(fs.readFileSync(dataFile(), 'utf8'));
    data = { on: d.on !== false, locked: d.locked === true, items: (Array.isArray(d.items) ? d.items : []).map(clean).filter(Boolean).slice(0, 40) };
  } catch {}
}
let saveTimer = null;
const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { fs.writeFileSync(dataFile(), JSON.stringify(data, null, 1)); } catch {} }, 300); };
const find = id => data.items.find(x => x.id === id);

// ---------- what they show ----------
let state = {}, cover = '', agenda = [], hasBattery = true;
const system = { cpu: 0, ram: 0, ramUsed: 0, ramTotal: 0, history: [] };
let cpuBefore = os.cpus();
function readSystem() {
  const now = os.cpus(); let idle = 0, total = 0;
  now.forEach((c, i) => { const b = cpuBefore[i]?.times; if (!b) return; for (const k in c.times) total += c.times[k] - b[k]; idle += c.times.idle - b.idle; });
  cpuBefore = now;
  system.cpu = total > 0 ? Math.round(100 * (1 - idle / total)) : 0;
  const all = os.totalmem(), free = os.freemem();
  system.ram = Math.round(100 * (1 - free / all)); system.ramUsed = ((all - free) / 2 ** 30).toFixed(1); system.ramTotal = Math.round(all / 2 ** 30);
  system.history = [...system.history, system.cpu].slice(-40);
}
// a desktop PC has no battery: the battery widget then says it is on the mains
function readBattery() {
  if (process.platform !== 'win32') return;
  execFile(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', '(Get-CimInstance Win32_Battery | Measure-Object).Count'],
    { windowsHide: true, timeout: 15000 }, (error, out) => { if (!error) hasBattery = Number(String(out).trim()) > 0; });
}
async function readAgenda() { if (app.winlandAgenda) agenda = await app.winlandAgenda().catch(() => agenda); send({ agenda }); }

// ---------- the windows ----------
const wins = new Map();
const sizeOf = it => SIZES[it.size];
const island = () => BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL()));
const fromWidget = e => { const w = BrowserWindow.fromWebContents(e.sender); return w && [...wins.entries()].find(([, v]) => v === w)?.[0]; };
let gallery = null;
const fromGallery = e => gallery && !gallery.isDestroyed() && e.sender === gallery.webContents;
function send(update) { for (const w of wins.values()) if (!w.isDestroyed()) w.webContents.send('widget:update', update); }
function changed() { if (gallery && !gallery.isDestroyed()) gallery.webContents.send('widgets:changed', listView()); app.emit('winland-tray-refresh'); }

// on the desktop: owned by it (Progman), under the other windows; the helper does it (winland-helper.cs, Desk)
function toDesktop(win, how = 'deskwin') {
  if (win.isDestroyed()) return;
  const h = win.getNativeWindowHandle();
  const value = h.length >= 8 ? h.readBigUInt64LE(0) : BigInt(h.readUInt32LE(0));
  app.winlandHelper?.(`${how} ${value}`);
}
function open(it) {
  if (wins.has(it.id)) return;
  const [w, h] = sizeOf(it);
  const win = new BrowserWindow({
    x: it.x - PAD, y: it.y - PAD, width: w + 2 * PAD, height: h + 2 * PAD, show: false, frame: false, transparent: true, backgroundColor: '#00000000',
    resizable: false, maximizable: false, minimizable: false, fullscreenable: false, skipTaskbar: true, hasShadow: false,
    focusable: it.kind === 'note', movable: !data.locked, title: 'WinLand widget',
    webPreferences: { preload: path.join(__dirname, 'widget-preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false }
  });
  wins.set(it.id, win);
  win.setIgnoreMouseEvents(true); // through to the desktop, except on the card (hovering(), below)
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.loadFile(path.join(__dirname, 'widget.html'), { query: { id: it.id } });
  win.once('ready-to-show', () => { win.showInactive(); toDesktop(win); setTimeout(() => toDesktop(win), 3000); }); // again once the helper surely runs
  win.on('moved', () => placed(it.id));
  win.on('blur', () => toDesktop(win, 'deskbottom')); // a note you typed in goes back under the windows
  win.on('closed', () => { if (wins.get(it.id) === win) wins.delete(it.id); });
}
function close(id) { const w = wins.get(id); wins.delete(id); hovered.delete(id); if (w && !w.isDestroyed()) w.destroy(); }
// A widget's window is bigger than its card (room for the shadow). It catches the mouse only while the mouse is on
// the card, so the desktop icons around it still work. Watched from here: Windows forwards no mouse moves over a
// card you can drag, so the page itself cannot tell.
const hovered = new Map();
function hovering() {
  if (!wins.size) return;
  const p = screen.getCursorScreenPoint();
  for (const [id, w] of wins) {
    const it = find(id); if (!it || w.isDestroyed()) continue;
    const b = w.getBounds(), [cw, ch] = sizeOf(it), x = b.x + PAD, y = b.y + PAD;
    const on = p.x >= x - 10 && p.x <= x + cw && p.y >= y - 10 && p.y <= y + ch; // 10 px more at the top left: the "−"
    if (hovered.get(id) !== on) { hovered.set(id, on); w.setIgnoreMouseEvents(!on); }
  }
}
function openAll() { if (!data.on) return; for (const it of data.items) open(it); }
function closeAll() { for (const id of [...wins.keys()]) close(id); }

// dropped somewhere: on the 8 px grid, inside the screen it is on
function placed(id) {
  const it = find(id), win = wins.get(id); if (!it || !win || win.isDestroyed()) return;
  const b = win.getBounds(), [w, h] = sizeOf(it);
  const area = screen.getDisplayMatching({ x: b.x + PAD, y: b.y + PAD, width: w, height: h }).workArea;
  const x = Math.max(area.x + GRID, Math.min(area.x + area.width - w - GRID, area.x + Math.round((b.x + PAD - area.x) / GRID) * GRID));
  const y = Math.max(area.y + GRID, Math.min(area.y + area.height - h - GRID, area.y + Math.round((b.y + PAD - area.y) / GRID) * GRID));
  if (x - PAD !== b.x || y - PAD !== b.y) win.setPosition(x - PAD, y - PAD);
  if (x !== it.x || y !== it.y) { it.x = x; it.y = y; save(); }
}
// a new widget: the first free place from the top left of the main screen, as on a Mac
function freePlace(size) {
  const [w, h] = SIZES[size], area = screen.getPrimaryDisplay().workArea;
  const taken = data.items.map(it => { const [iw, ih] = sizeOf(it); return { x: it.x - GAP, y: it.y - GAP, w: iw + 2 * GAP, h: ih + 2 * GAP }; });
  for (let x = area.x + 32; x + w <= area.x + area.width - 16; x += GRID * 2) {
    for (let y = area.y + 32; y + h <= area.y + area.height - 16; y += GRID * 2) {
      if (!taken.some(t => x < t.x + t.w && x + w > t.x && y < t.y + t.h && y + h > t.y)) return { x, y };
    }
  }
  return { x: area.x + 32, y: area.y + 32 };
}

function add(kind, size, opts) {
  if (!KINDS[kind] || data.items.length >= 40) return null;
  const sz = KINDS[kind].includes(size) ? size : KINDS[kind][0];
  const it = clean({ kind, size: sz, ...freePlace(sz), opts });
  data.items.push(it); save(); if (data.on) open(it); changed();
  return it;
}
function update(id, patch) {
  const it = find(id); if (!it) return null;
  const next = clean({ ...it, size: patch.size || it.size, opts: patch.opts ? { ...it.opts, ...patch.opts } : it.opts });
  const oldPicture = it.opts.image;
  Object.assign(it, { size: next.size, opts: next.opts });
  if (oldPicture && oldPicture !== it.opts.image) dropPicture(oldPicture);
  const win = wins.get(id);
  if (win && !win.isDestroyed()) {
    const [w, h] = sizeOf(it); win.setBounds({ x: it.x - PAD, y: it.y - PAD, width: w + 2 * PAD, height: h + 2 * PAD });
    win.webContents.send('widget:update', { item: it });
    setTimeout(() => placed(id), 50); // bigger: still inside the screen
  }
  save(); changed(); return it;
}
function remove(id) {
  const i = data.items.findIndex(x => x.id === id); if (i < 0) return;
  const [it] = data.items.splice(i, 1); close(id);
  if (it.opts.image) dropPicture(it.opts.image);
  save(); changed();
}
// a picture nobody uses any more is deleted from WinLand's folder (your own file stays where it was)
function dropPicture(name) { if (!data.items.some(x => x.opts.image === name)) try { fs.rmSync(path.join(pictures(), name), { force: true }); } catch {} }
function setLocked(on) {
  data.locked = Boolean(on); save();
  for (const w of wins.values()) if (!w.isDestroyed()) w.setMovable(!data.locked);
  send({ locked: data.locked }); changed();
}
function setOn(on) { data.on = Boolean(on); save(); if (data.on) openAll(); else closeAll(); changed(); }

// ---------- the gallery: every kind to add, your widgets, their words and pictures ----------
function listView() {
  return { on: data.on, locked: data.locked, lang: lang(), kinds: KINDS, items: data.items, state, cover, system, agenda, hasBattery, pictures: pathToFileURL(pictures() + path.sep).href };
}
function openGallery() {
  if (gallery && !gallery.isDestroyed()) { if (gallery.isMinimized()) gallery.restore(); gallery.show(); gallery.focus(); return; }
  gallery = new BrowserWindow({
    width: 900, height: 700, minWidth: 720, minHeight: 520, show: false, title: 'Widgets — WinLand', backgroundColor: '#1c1c1e', autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: { preload: path.join(__dirname, 'widget-preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false }
  });
  gallery.setMenu(null);
  gallery.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  gallery.webContents.on('will-navigate', e => e.preventDefault());
  gallery.loadFile(path.join(__dirname, 'widgets-gallery.html'), { query: { lang: lang() } });
  gallery.once('ready-to-show', () => gallery.show());
  gallery.on('closed', () => { gallery = null; });
}

// ---------- the widget's menu (right click) ----------
function menu(id, win) {
  const it = find(id); if (!it) return;
  const NAMES = { s: say('Petit', 'Small'), m: say('Moyen', 'Medium'), l: say('Grand', 'Large') };
  const template = [
    ...KINDS[it.kind].map(sz => ({ label: NAMES[sz], type: 'radio', checked: it.size === sz, click: () => update(id, { size: sz }) })),
    { type: 'separator' },
    ...(['note', 'countdown', 'custom'].includes(it.kind) ? [{ label: say('Modifier le widget…', 'Edit widget…'), click: () => { openGallery(); setTimeout(() => gallery?.webContents.send('widgets:changed', { ...listView(), edit: id }), 400); } }] : []),
    { label: say('Verrouiller l’emplacement', 'Lock placement'), type: 'checkbox', checked: data.locked, click: item => setLocked(item.checked) },
    { label: say('Ajouter des widgets…', 'Add widgets…'), click: openGallery },
    { type: 'separator' },
    { label: say('Supprimer le widget', 'Remove widget'), click: () => remove(id) }
  ];
  Menu.buildFromTemplate(template).popup({ window: win });
}

// ---------- messages ----------
ipcMain.handle('widget:get', e => {
  const id = fromWidget(e), it = id && find(id); if (!it) return null;
  return { item: it, locked: data.locked, lang: lang(), state, cover, system, agenda, hasBattery, pictures: pathToFileURL(pictures() + path.sep).href };
});
ipcMain.on('widget:menu', e => { const id = fromWidget(e); if (id) menu(id, wins.get(id)); });
ipcMain.on('widget:remove', e => { const id = fromWidget(e); if (id && !data.locked) remove(id); });
ipcMain.on('widget:act', (e, kind) => { if (fromWidget(e) && ['play', 'pause', 'next', 'previous'].includes(kind)) island()?.webContents.send('widgets:do', { kind }); });
ipcMain.on('widget:open', e => {
  const id = fromWidget(e), it = id && find(id); if (!it || !data.locked) return; // unlocked, a click is the start of a move
  if (it.kind === 'claude') { const w = island(); if (w) { w.showInactive(); w.webContents.send('extras:shortcut', 'home'); } return; }
  const target = OPENS[it.kind]; if (!target) return;
  if (target === 'taskmgr') execFile('taskmgr.exe', [], { windowsHide: false }, () => {}); else shell.openExternal(target).catch(() => {});
});
ipcMain.on('widget:note', (e, req) => { const id = fromWidget(e); if (id && id === req?.id) { const it = find(id); if (it?.kind === 'note') { it.opts.text = String(req.text || '').slice(0, 4000); save(); changed(); } } });

ipcMain.handle('widgets:list', e => fromGallery(e) ? listView() : null);
ipcMain.handle('widgets:add', (e, req) => fromGallery(e) ? add(String(req?.kind), String(req?.size), req?.opts || {}) : null);
ipcMain.handle('widgets:update', (e, req) => fromGallery(e) ? update(String(req?.id), req?.patch || {}) : null);
ipcMain.handle('widgets:remove', (e, id) => { if (fromGallery(e)) remove(String(id)); return listView(); });
ipcMain.handle('widgets:prefs', (e, req) => {
  if (!fromGallery(e)) return null;
  if (typeof req?.locked === 'boolean') setLocked(req.locked);
  if (typeof req?.on === 'boolean') setOn(req.on);
  return listView();
});
// your own picture: copied into WinLand's folder under a random name (the widget never reads elsewhere)
ipcMain.handle('widgets:pick-image', async e => {
  if (!fromGallery(e)) return { ok: false };
  const r = await dialog.showOpenDialog(gallery, { title: say('Choisir une image', 'Choose a picture'), properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }] });
  const file = r.filePaths?.[0]; if (r.canceled || !file) return { ok: false };
  const ext = path.extname(file).slice(1).toLowerCase(); if (!/^(png|jpe?g|webp|gif)$/.test(ext)) return { ok: false };
  if (fs.statSync(file).size > 25 * 1024 * 1024) return { ok: false, error: say('Image trop lourde (25 Mo au plus).', 'Picture too big (25 MB at most).') };
  const name = crypto.randomBytes(12).toString('hex') + '.' + ext;
  fs.mkdirSync(pictures(), { recursive: true }); fs.copyFileSync(file, path.join(pictures(), name));
  return { ok: true, image: name };
});
// from the island (Settings → Widgets, its own menus): the gallery
ipcMain.on('widgets:gallery', e => { try { if (path.basename(fileURLToPath(e.sender.getURL())) === 'mascot.html') openGallery(); } catch {} });
// what the island knows: the music, Claude Code (widgets-ui.js), every second or so
ipcMain.on('widgets:state', (e, s) => {
  try { if (path.basename(fileURLToPath(e.sender.getURL())) !== 'mascot.html') return; } catch { return; }
  if (typeof s?.cover === 'string') { cover = /^data:image\/(png|jpe?g|webp);base64,/.test(s.cover) ? s.cover : ''; send({ cover }); }
  state = { music: s?.music || {}, claude: s?.claude || {} };
  if (wins.size || gallery) { send({ state }); if (gallery && !gallery.isDestroyed()) gallery.webContents.send('widgets:changed', { state, cover }); }
});

// for the tray menu (tray-main.cjs)
app.winlandWidgets = { gallery: openGallery, locked: () => data.locked, setLocked, count: () => data.items.length };

app.whenReady().then(() => {
  load(); readBattery();
  setTimeout(openAll, 1500); // after the island: the helper puts them on the desktop
  setInterval(hovering, 50);
  setInterval(() => { if (!wins.size && !gallery) return; readSystem(); send({ system }); if (gallery && !gallery.isDestroyed()) gallery.webContents.send('widgets:changed', { system }); }, 2000);
  setTimeout(readAgenda, 4000); setInterval(() => { if (data.items.some(x => x.kind === 'calendar')) readAgenda(); }, 5 * 60000);
  screen.on('display-removed', () => { for (const it of data.items) placed(it.id); }); // a screen unplugged: back on one that is there
});
app.on('before-quit', () => { clearTimeout(saveTimer); try { fs.writeFileSync(dataFile(), JSON.stringify(data, null, 1)); } catch {} });
