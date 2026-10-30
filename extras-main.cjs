'use strict';
// Extras for the island (main process): file tray,
// volume changes and Bluetooth battery levels. Only the WinLand window may use these channels.
const { spawn, execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');

const POWERSHELL = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
const BLANK_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function setup(electron) {
  const { app, ipcMain, shell, nativeImage, BrowserWindow } = electron;
  const file = name => path.join(app.getPath('userData'), name);
  const readJson = (name, fallback) => { try { return JSON.parse(fs.readFileSync(file(name), 'utf8')); } catch { return fallback; } };
  const writeJson = (name, value) => { try { fs.writeFileSync(file(name), JSON.stringify(value)); } catch {} };
  const trusted = event => {
    try { return path.resolve(fileURLToPath(event.sender.getURL())).toLowerCase() === path.join(__dirname, 'mascot.html').toLowerCase(); }
    catch { return false; }
  };
  const handle = (channel, fn) => ipcMain.handle(channel, async (event, payload) => {
    if (!trusted(event)) return { ok: false, error: 'Geen toegang.' };
    try { return { ok: true, ...(await fn(payload, event)) }; } catch (error) { return { ok: false, error: error.message }; }
  });
  const send = (channel, data) => { for (const win of BrowserWindow.getAllWindows()) if (!win.isDestroyed() && trusted({ sender: win.webContents })) win.webContents.send(channel, data); };

  // ---------- file tray: remembers paths of files you drop on the island ----------
  let tray = readJson('tray.json', []).filter(p => typeof p === 'string' && fs.existsSync(p));
  const icons = new Map();
  const trayView = async () => ({ files: await Promise.all(tray.map(async p => {
    let icon = icons.get(p);
    if (!icon) { try { icon = await app.getFileIcon(p, { size: 'normal' }); icons.set(p, icon); } catch {} }
    let size = 0; try { size = fs.statSync(p).size; } catch {}
    return { path: p, name: path.basename(p), icon: icon ? icon.toDataURL() : '', size };
  })) });
  handle('extras:tray-get', trayView);
  handle('extras:tray-add', async payload => {
    for (const p of (Array.isArray(payload?.paths) ? payload.paths : []).slice(0, 20)) {
      if (typeof p === 'string' && path.isAbsolute(p) && fs.existsSync(p) && !tray.includes(p)) tray.unshift(p);
    }
    tray = tray.slice(0, 24); writeJson('tray.json', tray); return trayView();
  });
  handle('extras:tray-remove', async payload => { tray = tray.filter(p => p !== payload?.path); writeJson('tray.json', tray); return trayView(); });
  handle('extras:tray-open', async payload => {
    if (!tray.includes(payload?.path)) throw new Error('Dit bestand staat niet in de lade.');
    const problem = await shell.openPath(payload.path); if (problem) throw new Error(problem); return {};
  });
  ipcMain.on('extras:tray-drag', (event, p) => {
    if (!trusted(event) || !tray.includes(p) || !fs.existsSync(p)) return;
    event.sender.startDrag({ file: p, icon: icons.get(p) || nativeImage.createFromDataURL(BLANK_PNG) });
  });

  // ---------- volume: a small PowerShell helper reports every change of the master volume ----------
  let volumeChild = null, volumeNow = null, foreground = 'none';
  const privacy = { mic: [], cam: [] };
  // ---------- Controls page: audio outputs (winland-helper), lock, screenshot, mute ----------
  const outputWaiters = [];
  const askOutputs = line => new Promise(done => {
    if (!volumeChild?.stdin) return done([]);
    outputWaiters.push(done); volumeChild.stdin.write(line + '\n');
    setTimeout(() => { const i = outputWaiters.indexOf(done); if (i >= 0) { outputWaiters.splice(i, 1); done([]); } }, 3000); // the PowerShell fallback has no outputs
  });
  handle('extras:outputs', async () => ({ outputs: await askOutputs('outputs') }));
  // ---------- notifications, the microphone for the whole PC, OCR and the colour picker (winland-helper) ----------
  let notifAccess = '', micMuted = false;
  const answers = { pixel: [], ocr: [], agenda: [], rect: [] };
  const ask = (kind, line, wait = 8000) => new Promise(done => {
    if (!volumeChild?.stdin) return done(null);
    answers[kind].push(done); volumeChild.stdin.write(line + '\n');
    setTimeout(() => { const i = answers[kind].indexOf(done); if (i >= 0) { answers[kind].splice(i, 1); done(null); } }, wait);
  });
  app.winlandFrontRect = async skipPid => { const r = await ask('rect', 'rect ' + (Number(skipPid) || 0), 1500); const n = String(r || '-').split(' ').map(Number); return n.length === 4 && n.every(Number.isFinite) ? { x: n[0], y: n[1], width: n[2], height: n[3] } : null; }; // Pip on the desktop
  const setMic = on => { volumeChild?.stdin?.write('micmute ' + (on ? '1' : '0') + '\n'); };
  handle('extras:mic-get', async () => ({ muted: micMuted, notifications: notifAccess }));
  handle('extras:mic-set', async payload => { setMic(Boolean(payload?.muted)); return {}; });
  handle('extras:idle', async () => ({ seconds: electron.powerMonitor.getSystemIdleTime() })); // how long nobody touched the PC (automations)
  handle('extras:agenda', async () => { let list = []; try { list = JSON.parse(await ask('agenda', 'agenda', 8000)); } catch {} return { list: Array.isArray(list) ? list : [] }; }); // the Windows calendar, today
  handle('extras:pixel', async () => { const r = await ask('pixel', 'pixel', 3000); const [hex] = String(r || '').split(' '); return { hex: /^#[0-9a-f]{6}$/.test(hex) ? hex : '' }; });
  // the text in a picture (a screenshot): Windows' own OCR, on this PC
  handle('extras:ocr', async payload => {
    const file = String(payload?.path || '');
    if (!path.isAbsolute(file) || !fs.existsSync(file) || !/\.(png|jpe?g|bmp)$/i.test(file)) throw new Error('image');
    const r = await ask('ocr', 'ocr ' + Buffer.from(file, 'utf8').toString('base64'), 15000);
    let out = { ok: false }; try { out = JSON.parse(r); } catch {}
    if (out.ok && out.text && payload?.copy) { electron.clipboard.writeText(out.text); }
    return { text: out.ok ? out.text || '' : '', error: out.ok ? '' : out.error || 'ocr' };
  });
  // ---------- screen time: how long each program was in front today (kept on this PC, 14 days) ----------
  const screenTime = (() => {
    const day = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }; // your day, not UTC's
    let data = readJson('screen-time.json', {}), current = '', since = Date.now(), dirty = false;
    const add = () => {
      const now = Date.now(), d = day(), away = electron.powerMonitor.getSystemIdleTime() > 300; // nobody there for 5 min: not screen time
      if (current && !away && !/^(LockApp|explorer|ShellExperienceHost|SearchHost|StartMenuExperienceHost)$/i.test(current)) {
        (data[d] ||= {})[current] = ((data[d] || {})[current] || 0) + Math.min(now - since, 120000); dirty = true; }
      since = now;
    };
    const tick = setInterval(() => { add(); if (dirty) { const keep = Object.keys(data).sort().slice(-14); data = Object.fromEntries(keep.map(k => [k, data[k]])); writeJson('screen-time.json', data); dirty = false; } }, 60000); tick.unref?.();
    return { front: name => { add(); current = name; }, today: () => { add(); return data[day()] || {}; } };
  })();
  // a link or a path you copied (smart clipboard): a web link in the browser, a file or folder that exists
  handle('extras:open-copied', async payload => {
    const t = String(payload?.text || '').trim();
    if (/^https?:\/\/\S+$/i.test(t)) { await shell.openExternal(t); return {}; }
    const p = t.replace(/^~(?=[\\/])/, app.getPath('home'));
    if (!path.isAbsolute(p) || !fs.existsSync(p)) throw new Error('missing');
    const problem = await shell.openPath(p); if (problem) throw new Error(problem); return {};
  });
  // ---------- voice notes (Studio page): Music\WinLand ----------
  const memoDir = () => path.join(app.getPath('music'), 'WinLand');
  handle('studio:memo-save', async payload => {
    const data = Buffer.from(String(payload?.data || ''), 'base64'); if (!data.length || data.length > 200 * 1024 * 1024) throw new Error('empty');
    fs.mkdirSync(memoDir(), { recursive: true });
    const d = new Date(), p2 = n => String(n).padStart(2, '0');
    const name = `Note vocale ${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}h${p2(d.getMinutes())}${p2(d.getSeconds())}.webm`;
    fs.writeFileSync(path.join(memoDir(), name), data); return { name };
  });
  handle('studio:memos', async () => {
    let list = []; try { list = fs.readdirSync(memoDir()).filter(f => /\.(webm|wav|mp3|m4a|ogg)$/i.test(f)).map(f => ({ name: f, at: fs.statSync(path.join(memoDir(), f)).mtimeMs })); } catch {}
    return { memos: list.sort((a, b) => b.at - a.at).slice(0, 8) };
  });
  handle('studio:memo-open', async payload => { // a note (only a file of that folder), or the folder itself
    const name = path.basename(String(payload?.name || '')), p = name ? path.join(memoDir(), name) : memoDir();
    fs.mkdirSync(memoDir(), { recursive: true }); const problem = await shell.openPath(p); if (problem) throw new Error(problem); return {};
  });
  handle('extras:screen-time', async () => ({ today: Object.entries(screenTime.today()).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([app, ms]) => ({ app, ms })) }));
  // ---------- System page: processor, graphics card (winland-helper) and memory ----------
  const os = require('node:os');
  const gpuWaiters = [];
  let lastCpu = null;
  function cpuLoad() { // % of all cores since the last call
    const now = os.cpus().reduce((a, c) => { const t = c.times; a.idle += t.idle; a.total += t.user + t.nice + t.sys + t.idle + t.irq; return a; }, { idle: 0, total: 0 });
    const before = lastCpu; lastCpu = now;
    if (!before || now.total === before.total) return null;
    return Math.round(100 * (1 - (now.idle - before.idle) / (now.total - before.total)));
  }
  const gpuLoad = () => new Promise(done => {
    if (!volumeChild?.stdin) return done(null);
    gpuWaiters.push(done); volumeChild.stdin.write('gpu\n');
    setTimeout(() => { const i = gpuWaiters.indexOf(done); if (i >= 0) { gpuWaiters.splice(i, 1); done(null); } }, 4000);
  });
  handle('extras:system', async () => ({
    cpu: cpuLoad(), gpu: await gpuLoad(), ram: { used: os.totalmem() - os.freemem(), total: os.totalmem() }, uptime: os.uptime(), cpuName: os.cpus()[0]?.model?.trim() || ''
  }));
  handle('extras:output-set', async payload => {
    const id = String(payload?.id || '');
    if (!/^\{[\w.]+\}\.\{[\w-]+\}$/.test(id)) throw new Error('Onbekend apparaat.');
    return { outputs: await askOutputs('output ' + id) };
  });
  handle('extras:lock', async () => { execFile('rundll32.exe', ['user32.dll,LockWorkStation'], { windowsHide: true }, () => {}); return {}; });
  handle('extras:clock', async () => { await shell.openExternal('ms-clock:'); return {}; }); // Windows' Clock app
  handle('extras:snip', async () => { await shell.openExternal('ms-screenclip:'); return {}; }); // Windows' own snipping tool
  handle('extras:mute', async payload => { volumeChild?.stdin?.write(`mute ${payload?.on ? 1 : 0}\n`); return {}; });
  // the volume block on the home screen sets the Windows volume (0-100) through the same helper
  handle('extras:volume-set', async payload => {
    const level = Math.max(0, Math.min(100, Math.round(Number(payload?.level))));
    if (!Number.isFinite(level) || !volumeChild?.stdin) throw new Error('Volume niet beschikbaar.');
    volumeChild.stdin.write(`set ${level}
`); return {};
  });
  handle('extras:volume-get', async () => ({ volume: volumeNow }));
  handle('extras:foreground-get', async () => ({ mode: foreground }));
  handle('extras:privacy-get', async () => ({ privacy }));

  // ---------- new screenshots and finished downloads: the island shows them (and can put them in the tray) ----------
  const PARTIAL = /\.(crdownload|part|partial|download|tmp|opdownload)$|^~\$|^\./i;
  const seenFiles = new Set();
  function watchFolder(dir, kind, pattern) {
    try {
      if (!fs.existsSync(dir)) return;
      fs.watch(dir, (event, name) => {
        if (!name || PARTIAL.test(name) || (pattern && !pattern.test(name))) return;
        const file = path.join(dir, name);
        if (seenFiles.has(file)) return;
        // a file is done when its size stays the same for a moment (browsers and tools write in parts)
        const check = (last, tries) => setTimeout(() => {
          let size = -1; try { const st = fs.statSync(file); if (!st.isFile()) return; size = st.size; } catch { return; }
          if (size > 0 && size === last) { seenFiles.add(file); send('extras:new-file', { kind, path: file, name }); return; }
          if (tries < 40) check(size, tries + 1);
        }, 700);
        check(-2, 0);
      });
    } catch {}
  }
  app.whenReady().then(() => {
    watchFolder(path.join(app.getPath('pictures'), 'Screenshots'), 'shot', /\.(png|jpe?g)$/i);
    watchFolder(app.getPath('downloads'), 'download', null);
  });
  let quitting = false, restarts = 0;
  function startVolume() {
    if (process.platform !== 'win32' || volumeChild) return;
    const [file, args] = require('./helper.cjs').command('watch', ['--parent', String(process.pid)], 'volume-watch.ps1', ['-Parent', String(process.pid)]); // winland-helper.exe, or the script
    volumeChild = spawn(file, args,
      { windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'ignore'] });
    volumeChild.stdin?.on?.('error', () => {});
    let buffer = '';
    volumeChild.stdout.on('data', chunk => {
      buffer += chunk.toString();
      let end; while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end).trim(), space = line.indexOf(' '); buffer = buffer.slice(end + 1);
        const [level, muted] = space < 0 ? [line, ''] : [line.slice(0, space), line.slice(space + 1)];
        if (level === 'gpu') { gpuWaiters.splice(0).forEach(done => done(Number(muted))); continue; }
        if (level === 'outputs') { let list = []; try { list = JSON.parse(muted); } catch {} outputWaiters.splice(0).forEach(done => done(list)); continue; }
        if (level === 'mic' || level === 'cam') { privacy[level] = (muted || '').split('|').filter(Boolean); send('extras:privacy', privacy); continue; } // who uses them
        if (level === 'fg') { foreground = muted; send('extras:foreground', foreground); continue; } // the window in front: none / cover / game
        if (level === 'notif') { try { send('extras:notif', JSON.parse(muted)); } catch {} continue; } // a Windows notification (Discord, Outlook…)
        if (level === 'notif-access') { notifAccess = muted; continue; }
        if (level === 'micmute') { micMuted = muted === '1'; send('extras:micmute', { muted: micMuted, known: muted !== '-' }); continue; }
        if (level === 'front') { screenTime.front(muted); send('extras:front', muted); continue; } // the program in front (screen time, automations)
        if (level === 'pixel' || level === 'ocr' || level === 'agenda' || level === 'rect') { answers[level].splice(0).forEach(done => done(muted)); continue; }
        if (level !== undefined && level !== '') { volumeNow = { level: Number(level), muted: muted === '1' }; send('extras:volume', volumeNow); }
      }
    });
    volumeChild.on('exit', () => { // it stopped (a crash, a Windows update…): start it again, everything depends on it
      volumeChild = null;
      for (const list of [outputWaiters, gpuWaiters, ...Object.values(answers)]) list.splice(0).forEach(done => done(null));
      if (!quitting) { restarts++; setTimeout(startVolume, Math.min(60000, 2000 * restarts)); }
    });
    setTimeout(() => { if (volumeChild) restarts = 0; }, 60000); // it ran fine for a minute
  }

  // ---------- Bluetooth battery levels (headphones, mouse, ...) every 5 minutes ----------
  const BT_SCRIPT = `$k='{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2'
Get-PnpDevice -Class Bluetooth -Status OK -ErrorAction SilentlyContinue | ForEach-Object {
  $b = (Get-PnpDeviceProperty -InstanceId $_.InstanceId -KeyName $k -ErrorAction SilentlyContinue).Data
  if ($b -ne $null) { "$b|$($_.FriendlyName)" } }`;
  function readBluetooth() {
    if (process.platform !== 'win32') return;
    const child = spawn(POWERSHELL, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', BT_SCRIPT], { windowsHide: true, shell: false });
    let out = ''; child.stdout.on('data', d => { out += d; });
    child.on('exit', () => {
      const devices = out.split(/\r?\n/).map(line => line.split('|')).filter(([b, n]) => n && /^\d+$/.test(b)).map(([b, n]) => ({ name: n.trim(), battery: Number(b) }));
      send('extras:bluetooth', { devices });
    });
    child.on('error', () => {});
  }

  // ---------- clipboard history: your last 8 copied texts (only in memory, never saved to disk) ----------
  let clips = [], lastClip = '';
  const copiedAt = new Map(); // text → when it was copied
  const clipsView = () => ({ clips: clips.map(text => ({ text: text.slice(0, 400), long: text.length > 400, at: copiedAt.get(text) || 0 })) });
  async function readClipboard() {
    // readText can give a string or a promise (newer Electron); anything else is ignored.
    let text = ''; try { const r = electron.clipboard.readText(); text = typeof r === 'string' ? r : r && typeof r.then === 'function' ? await r : ''; } catch {}
    if (typeof text !== 'string' || !text || text === lastClip) return; lastClip = text;
    if (!text.trim() || text.length > 20000) return;
    clips = [text, ...clips.filter(c => c !== text)].slice(0, 8); copiedAt.set(text, Date.now());
    for (const key of copiedAt.keys()) if (!clips.includes(key)) copiedAt.delete(key);
    send('extras:clips', clipsView());
  }
  handle('extras:clips-get', async () => clipsView());
  handle('extras:clips-copy', async payload => {
    const text = clips[Number(payload?.index)]; if (typeof text !== 'string') throw new Error('Niet gevonden.');
    electron.clipboard.writeText(text); lastClip = text; clips = [text, ...clips.filter(c => c !== text)]; copiedAt.set(text, Date.now()); return clipsView();
  });
  handle('extras:clips-clear', async () => { clips = []; return clipsView(); });

  // ---------- quick note: one note, saved on your PC ----------
  handle('extras:note-get', async () => ({ text: readJson('note.json', { text: '' }).text || '' }));
  handle('extras:note-set', async payload => { writeJson('note.json', { text: String(payload?.text || '').slice(0, 20000) }); return {}; });

  // ---------- keyboard shortcuts: Ctrl+Alt+1..6 jump straight to a screen ----------
  const SHORTCUTS = { 1: 'home', 2: 'spotify', 3: 'claude', 4: 'focus', 5: 'clips', 6: 'note' };
  app.on('will-quit', () => { try { for (const n of [...Object.keys(SHORTCUTS), 'M']) electron.globalShortcut.unregister('CommandOrControl+Alt+' + n); } catch {} });

  app.whenReady().then(() => {
    const poll = setInterval(() => { readClipboard().catch(() => {}); }, 1000); poll.unref?.();
    for (const [n, view] of Object.entries(SHORTCUTS)) { try { electron.globalShortcut.register('CommandOrControl+Alt+' + n, () => send('extras:shortcut', view)); } catch {} }
    try { electron.globalShortcut.register('CommandOrControl+Alt+M', () => { setMic(!micMuted); send('extras:mic-key', { muted: !micMuted }); }); } catch {}
    // Real sound wave: the island may listen to what the PC plays (Windows "loopback" audio).
    // Only volume levels are measured in the island itself; nothing is recorded or sent anywhere.
    const { session, desktopCapturer } = electron;
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
      if (!trusted({ sender: { getURL: () => request.frame?.url || '' } })) return callback({}); // only the WinLand island
      desktopCapturer.getSources({ types: ['screen'] }).then(sources => callback({ video: sources[0], audio: 'loopback' })).catch(() => callback({}));
    });
    startVolume();
    setTimeout(readBluetooth, 15000); const bt = setInterval(readBluetooth, 5 * 60000); bt.unref?.();
  });
  app.on('before-quit', () => { quitting = true; try { volumeChild?.kill(); } catch {} });
}


if (process.versions.electron) setup(require('electron'));
