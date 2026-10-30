'use strict';
// Command palette (main process): Alt+Space opens it in the island (palette-ui.js). What it can find, all on this PC:
// the programs of the Start menu, your recent files, your projects (Dev page, Claude Code / Codex), and your own
// scripts (%APPDATA%\dynamic-winland\scripts). It also sends a task to Claude Code in a terminal and frees a port.
const { app, ipcMain, shell, BrowserWindow, globalShortcut } = require('electron');
const { execFile, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const island = () => BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL()));
const fromIsland = e => /mascot\.html/.test(e.senderFrame?.url || '');
const run = (file, args) => new Promise(done => execFile(file, args, { windowsHide: true, timeout: 5000, maxBuffer: 8 * 1024 * 1024 }, (error, out) => done(error && !out ? '' : String(out || ''))));
const scriptsDir = () => path.join(app.getPath('userData'), 'scripts');

// ---------- what can be found ----------
function walk(dir, depth, out, test) {
  let items = []; try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const item of items) {
    const p = path.join(dir, item.name);
    if (item.isDirectory() && depth > 0) walk(p, depth - 1, out, test); else if (item.isFile() && test(item.name)) out.push(p);
  }
}
let index = null, indexedAt = 0;
// Only palette:index refreshes the list: the ids the palette shows are positions in it, so opening uses the same list.
function build(fresh) {
  if (index && (!fresh || Date.now() - indexedAt < 60000)) return index;
  const lnk = n => /\.lnk$/i.test(n) && !/uninstall|désinstall|readme|help|website/i.test(n);
  const starts = [];
  for (const root of [path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'), path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs')]) walk(root, 3, starts, lnk);
  const seen = new Set(), apps = [];
  for (const p of starts) { const name = path.basename(p, '.lnk'); if (seen.has(name.toLowerCase())) continue; seen.add(name.toLowerCase()); apps.push({ name, path: p }); }
  // recent files (Windows keeps shortcuts to them), newest first
  const recentDir = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Recent'), recent = [];
  try { for (const f of fs.readdirSync(recentDir)) if (/\.lnk$/i.test(f)) { const p = path.join(recentDir, f); recent.push({ name: f.replace(/\.lnk$/i, ''), path: p, at: fs.statSync(p).mtimeMs }); } } catch {}
  recent.sort((a, b) => b.at - a.at);
  // projects: the Dev page's own folders and the folders Claude Code / Codex worked in
  const dirs = new Map();
  try { for (const d of JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'dev.json'), 'utf8')).folders || []) dirs.set(d.toLowerCase(), d); } catch {}
  for (const p of app.winlandMonitor?.projects?.() || []) if (p.cwd) dirs.set(p.cwd.toLowerCase(), p.cwd);
  const projects = [...dirs.values()].filter(d => fs.existsSync(d)).map(d => ({ name: path.basename(d), path: d }));
  // your own scripts
  const dir = scriptsDir();
  try { if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'LISEZ-MOI.txt'), 'Mets ici tes scripts (.ps1, .cmd, .bat, .js, .py) : la palette de WinLand (Alt+Espace) les lance.\r\nPut your scripts here (.ps1, .cmd, .bat, .js, .py): WinLand\'s palette (Alt+Space) runs them.\r\n'); } } catch {}
  const scripts = []; walk(dir, 1, scripts, n => /\.(ps1|cmd|bat|js|py)$/i.test(n));
  index = { apps, recent: recent.slice(0, 60), projects, scripts: scripts.map(p => ({ name: path.basename(p), path: p })) }; indexedAt = Date.now();
  return index;
}
ipcMain.handle('palette:index', e => {
  if (!fromIsland(e)) return null;
  const i = build(true), strip = list => list.map((x, n) => ({ id: n, name: x.name }));
  return { ok: true, apps: strip(i.apps), recent: strip(i.recent), projects: strip(i.projects), scripts: strip(i.scripts) };
});
ipcMain.handle('palette:open', async (e, req) => {
  if (!fromIsland(e)) return null;
  const list = build()[req?.kind], item = list?.[Number(req?.id)]; if (!item) return { ok: false };
  return openItem(req.kind, item, req);
});
async function openItem(kind, item, req) {
  if (kind === 'scripts') { // run it, in its own window for .ps1/.cmd so you see what it does
    const p = item.path, ext = path.extname(p).toLowerCase();
    if (ext === '.ps1') spawn('cmd.exe', ['/c', 'start', '""', 'powershell', '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', p], { cwd: path.dirname(p), detached: true, stdio: 'ignore', windowsHide: true }).unref();
    else if (ext === '.js') spawn('cmd.exe', ['/c', 'start', '""', 'cmd', '/k', 'bun', p], { cwd: path.dirname(p), detached: true, stdio: 'ignore', windowsHide: true }).unref();
    else if (ext === '.py') spawn('cmd.exe', ['/c', 'start', '""', 'cmd', '/k', 'python', p], { cwd: path.dirname(p), detached: true, stdio: 'ignore', windowsHide: true }).unref();
    else spawn('cmd.exe', ['/c', 'start', '""', 'cmd', '/k', p], { cwd: path.dirname(p), detached: true, stdio: 'ignore', windowsHide: true }).unref();
    return { ok: true };
  }
  if (kind === 'projects') { // VS Code when it is there, else the folder
    const code = [path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Microsoft VS Code', 'Code.exe'), path.join(process.env.ProgramFiles || '', 'Microsoft VS Code', 'Code.exe')].find(p => fs.existsSync(p));
    if (code && req.with !== 'folder') { spawn(code, [item.path], { detached: true, stdio: 'ignore' }).unref(); return { ok: true }; }
  }
  const problem = await shell.openPath(item.path); return { ok: !problem, error: problem };
}
// for the Stream Deck (remote-main.cjs): the lists, and opening one by its name
app.winlandLaunch = {
  lists: () => { const i = build(true); return { apps: i.apps.map(a => a.name), scripts: i.scripts.map(s => s.name), projects: i.projects.map(p => ({ name: p.name, path: p.path })) }; },
  open: (kind, name) => {
    const list = build()[kind] || [], item = list.find(x => x.name === name) || list.find(x => x.name.toLowerCase() === String(name).toLowerCase());
    return item ? openItem(kind, item, {}) : { ok: false, error: 'missing' };
  },
  pathOf: (kind, name) => (build()[kind] || []).find(x => x.name === name)?.path || ''
};
ipcMain.handle('palette:scripts-folder', async e => { if (!fromIsland(e)) return null; build(); await shell.openPath(scriptsDir()); return { ok: true }; });

// ---------- a task for Claude Code, in a terminal, in the project's folder ----------
let claudePath; // where your Claude Code is
function claudeExe() {
  if (claudePath !== undefined) return Promise.resolve(claudePath);
  const known = [path.join(app.getPath('home'), '.local', 'bin', 'claude.exe'), path.join(app.getPath('appData'), 'npm', 'claude.cmd')].find(p => fs.existsSync(p));
  if (known) return Promise.resolve(claudePath = known);
  return run('where.exe', ['claude']).then(out => (claudePath = out.split(/\r?\n/).map(l => l.trim()).find(l => /\.(exe|cmd)$/i.test(l)) || ''));
}
ipcMain.handle('palette:claude', async (e, req) => {
  if (!fromIsland(e)) return null;
  const prompt = String(req?.prompt || '').trim().slice(0, 2000); if (!prompt) return { ok: false };
  const projects = build().projects, dir = projects[Number(req?.project)]?.path || projects[0]?.path || app.getPath('home');
  const wt = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps', 'wt.exe');
  const exe = await claudeExe(); if (!exe) return { ok: false, error: 'claude' };
  if (/\.exe$/i.test(exe)) { // claude.exe gets the sentence as one argument, untouched (no cmd.exe reading & | > " in it)
    if (fs.existsSync(wt)) spawn(wt, ['-d', dir, exe, prompt.replace(/;/g, '\\;')], { detached: true, stdio: 'ignore' }).unref(); // ";" separates Windows Terminal commands
    else spawn(exe, [prompt], { cwd: dir, detached: true, stdio: 'ignore' }).unref(); // in its own console window
  } else { // claude.cmd (npm) goes through cmd.exe: the sentence in quotes, where & | < > ^ are plain text
    const quoted = '"' + prompt.replace(/["\r\n]+/g, ' ').replace(/%/g, '% ') + '"';
    spawn('cmd.exe', ['/d', '/c', 'start', '""', '/D', `"${dir}"`, 'cmd', '/k', `"${exe}"`, quoted], { detached: true, stdio: 'ignore', windowsVerbatimArguments: true }).unref();
  }
  return { ok: true, project: path.basename(dir) };
});

// ---------- who listens on a port, and stop it (never a Windows program) ----------
async function listener(port) {
  const out = await run('netstat.exe', ['-ano', '-p', 'TCP']);
  for (const line of out.split(/\r?\n/)) {
    const m = /^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)/i.exec(line);
    if (m && Number(m[1]) === port) {
      const pid = Number(m[2]), info = await run('tasklist.exe', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH']);
      return { pid, name: (/^"([^"]+)"/.exec(info.trim()) || [])[1] || '?' };
    }
  }
  return null;
}
ipcMain.handle('palette:port', async (e, req) => {
  if (!fromIsland(e)) return null;
  const port = Number(req?.port); if (!Number.isInteger(port) || port < 1 || port > 65535) return { ok: false };
  const who = await listener(port); if (!who) return { ok: true, free: true };
  if (!req.kill) return { ok: true, ...who };
  const exe = (await run('powershell.exe', ['-NoProfile', '-Command', `(Get-Process -Id ${who.pid} -ErrorAction SilentlyContinue).Path`])).trim();
  if (who.pid <= 4 || !exe || /^c:\\windows\\/i.test(exe)) return { ok: false, error: 'system', ...who }; // a Windows program: never
  await run('taskkill.exe', ['/PID', String(who.pid), '/T', '/F']);
  return { ok: true, killed: true, ...who };
});

// ---------- Alt+Space opens it ----------
app.whenReady().then(() => {
  try {
    globalShortcut.register('Alt+Space', () => {
      const win = island(); if (!win) return;
      win.show(); win.focus(); win.webContents.focus();
      win.webContents.send('palette:show');
    });
  } catch {}
});
app.on('will-quit', () => { try { globalShortcut.unregister('Alt+Space'); } catch {} });
