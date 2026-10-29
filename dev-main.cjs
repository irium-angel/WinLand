'use strict';
// Dev page (main process): what a developer wants to see at a glance, all read on this PC.
// - Git: branch, changed files and commits not pushed yet, for the folders Claude Code / Codex worked in
//   (ai-monitor-main.cjs) and the ones you add yourself. Read with your own git, never fetched from a server.
// - Local servers: ports a dev program (node, bun, python…) listens on (netstat + tasklist), with a stop button.
// - Watcher: tells the island when a dev program (bun, node, python, cargo, dotnet…) that ran a while ends.
// - Docker: your containers (docker ps, the local Docker), with start / stop; and "open in VS Code" for a project.
const { app, ipcMain, dialog, BrowserWindow } = require('electron');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const DEV_PROGRAMS = new Set(['node.exe', 'bun.exe', 'deno.exe', 'python.exe', 'pythonw.exe', 'py.exe', 'java.exe', 'javaw.exe', 'dotnet.exe',
  'cargo.exe', 'rustc.exe', 'go.exe', 'php.exe', 'ruby.exe', 'gradle.exe', 'mvn.exe', 'msbuild.exe', 'cl.exe', 'cmake.exe', 'ninja.exe', 'make.exe',
  'esbuild.exe', 'tsc.exe', 'uvicorn.exe', 'flask.exe', 'gunicorn.exe', 'hugo.exe', 'zig.exe', 'pnpm.exe', 'yarn.exe', 'npm.exe']);
const WATCH_MIN_MS = 10000, WATCH_MAX_MS = 30 * 60000; // a dev server you stop after hours is not "a command that finished"

const run = (file, args, timeout = 4000) => new Promise(resolve => {
  execFile(file, args, { windowsHide: true, timeout, maxBuffer: 4 * 1024 * 1024 }, (error, stdout) => resolve(error && !stdout ? null : String(stdout || '')));
});
const fromIsland = e => /mascot\.html/.test(e.senderFrame?.url || '');
const island = () => BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL()));

// ---------- the folders you added yourself ----------
const savedFile = () => path.join(app.getPath('userData'), 'dev.json');
let saved = null;
function own() { if (!saved) { try { saved = JSON.parse(fs.readFileSync(savedFile(), 'utf8')).folders || []; } catch { saved = []; } } return saved; }
function keep(list) { saved = list.slice(0, 8); try { fs.writeFileSync(savedFile(), JSON.stringify({ folders: saved })); } catch {} }

// ---------- git ----------
async function gitInfo(dir) {
  const status = await run('git', ['-C', dir, 'status', '--porcelain=v2', '--branch'], 4000);
  if (status == null || !status.includes('# branch.')) return null; // not a repository (or no git)
  const info = { dir, name: path.basename(dir), branch: '', upstream: '', ahead: 0, behind: 0, changed: 0, untracked: 0, last: '', lastAt: 0 };
  for (const line of status.split('\n')) {
    if (line.startsWith('# branch.head ')) info.branch = line.slice(14).trim();
    else if (line.startsWith('# branch.upstream ')) info.upstream = line.slice(18).trim();
    else if (line.startsWith('# branch.ab ')) { const m = /\+(\d+) -(\d+)/.exec(line); if (m) { info.ahead = +m[1]; info.behind = +m[2]; } }
    else if (/^[12u] /.test(line)) info.changed++;
    else if (line.startsWith('? ')) info.untracked++;
  }
  const last = await run('git', ['-C', dir, 'log', '-1', '--format=%ct%x09%s'], 3000);
  if (last && last.includes('\t')) { const [at, ...subject] = last.trim().split('\t'); info.lastAt = Number(at) * 1000 || 0; info.last = subject.join('\t').slice(0, 140); }
  return info;
}
function folders() {
  const list = [], seenDirs = new Set();
  for (const dir of [...own(), ...(app.winlandMonitor?.projects?.() || []).map(p => p.cwd)]) {
    if (typeof dir !== 'string' || !dir) continue;
    const key = path.resolve(dir).toLowerCase();
    if (seenDirs.has(key) || !fs.existsSync(dir)) continue;
    seenDirs.add(key); list.push(dir);
  }
  return list.slice(0, 6);
}

// ---------- programs and ports ----------
async function programs() { // pid -> { name, memKb }
  const out = await run('tasklist', ['/fo', 'csv', '/nh'], 5000), map = new Map();
  for (const line of (out || '').split(/\r?\n/)) {
    const m = /^"([^"]*)","(\d+)","[^"]*","\d+","([^"]*)"/.exec(line);
    if (m) map.set(Number(m[2]), { name: m[1], memKb: Number(m[3].replace(/\D/g, '')) || 0 });
  }
  return map;
}
// "TCP  127.0.0.1:5173  0.0.0.0:0  LISTENING  1234" (the state word depends on the Windows language: only the
// foreign address 0.0.0.0:0 / [::]:0 is the same everywhere, and that is what a listening port has)
function listening(text) {
  const list = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*TCP\s+(\S+):(\d+)\s+(0\.0\.0\.0:0|\[::\]:0)\s+\S+\s+(\d+)\s*$/i.exec(line);
    if (m) list.push({ address: m[1], port: Number(m[2]), pid: Number(m[4]) });
  }
  return list;
}
async function ports(progs) {
  const [v4, v6] = await Promise.all([run('netstat', ['-ano', '-p', 'TCP'], 5000), run('netstat', ['-ano', '-p', 'TCPv6'], 5000)]);
  const list = [], seenPorts = new Set();
  for (const { address, port, pid } of listening(`${v4 || ''}\n${v6 || ''}`)) {
    const p = progs.get(pid);
    if (!p || pid <= 4 || port < 1024 || port === 47823 || seenPorts.has(pid + ':' + port)) continue; // 47823: the island itself
    if (!DEV_PROGRAMS.has(p.name.toLowerCase())) continue; // only dev programs: other apps (VNC, TeamViewer, mouse software…) are not yours to stop here
    seenPorts.add(pid + ':' + port);
    list.push({ port, pid, name: p.name.replace(/\.exe$/i, ''), local: /^(127\.|\[::1\])/.test(address) });
  }
  return list.sort((a, b) => a.port - b.port).slice(0, 12);
}

// ---------- Docker (the docker program on this PC talks to the local Docker Desktop) ----------
let dockerKnown = null, lastContainers = [];
async function docker() {
  if (dockerKnown === null) dockerKnown = (await run('where', ['docker'], 3000)) != null;
  if (!dockerKnown) return { installed: false, running: false, containers: [] };
  const out = await run('docker', ['ps', '-a', '--format', '{{json .}}'], 4000);
  if (out == null) return { installed: true, running: false, containers: [] }; // Docker Desktop is not started
  const list = out.split(/\r?\n/).filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
    .map(c => ({ id: String(c.ID || ''), name: String(c.Names || ''), image: String(c.Image || ''), state: String(c.State || ''), status: String(c.Status || ''), ports: String(c.Ports || '') }))
    .sort((a, b) => (b.state === 'running') - (a.state === 'running')).slice(0, 8);
  lastContainers = list;
  return { installed: true, running: true, containers: list };
}

// ---------- VS Code ----------
function vscode() {
  const local = process.env.LOCALAPPDATA || '', programs = process.env.ProgramFiles || 'C:\\Program Files';
  return [path.join(local, 'Programs', 'Microsoft VS Code', 'Code.exe'), path.join(programs, 'Microsoft VS Code', 'Code.exe')].find(p => fs.existsSync(p)) || '';
}

let lastPorts = [];
async function view() {
  const progs = await programs();
  const [git, open, containers] = await Promise.all([Promise.all(folders().map(gitInfo)), ports(progs), docker()]);
  lastPorts = open;
  const running = [...progs].filter(([, p]) => DEV_PROGRAMS.has(p.name.toLowerCase()))
    .map(([pid, p]) => ({ pid, name: p.name.replace(/\.exe$/i, ''), memMb: Math.round(p.memKb / 1024), since: seen.get(pid)?.at || 0 }))
    .sort((a, b) => b.memMb - a.memMb).slice(0, 8);
  return { ok: true, git: git.filter(Boolean), ports: open, running, docker: containers, vscode: Boolean(vscode()) };
}

// ---------- the watcher: a dev program that ran a while has ended ----------
let watching = false, timer = null;
const seen = new Map(); // pid -> { name, at } of dev programs
async function tick() {
  const progs = await programs(), now = Date.now();
  for (const [pid, p] of progs) if (DEV_PROGRAMS.has(p.name.toLowerCase()) && !seen.has(pid)) seen.set(pid, { name: p.name.replace(/\.exe$/i, ''), at: now });
  for (const [pid, s] of seen) {
    if (progs.has(pid)) continue;
    seen.delete(pid);
    const ran = now - s.at;
    if (watching && ran >= WATCH_MIN_MS && ran <= WATCH_MAX_MS) island()?.webContents.send('dev:finished', { name: s.name, ms: ran });
  }
}
function setWatch(on) {
  watching = Boolean(on);
  if (watching && !timer) { tick(); timer = setInterval(tick, 4000); timer.unref?.(); }
  if (!watching && timer) { clearInterval(timer); timer = null; seen.clear(); }
}

ipcMain.handle('dev:get', e => fromIsland(e) ? view().catch(error => ({ ok: false, error: String(error?.message || error) })) : null);
ipcMain.handle('dev:add-folder', async e => {
  if (!fromIsland(e)) return null;
  const r = await dialog.showOpenDialog(island(), { properties: ['openDirectory'], title: 'Suivre un dossier Git' });
  if (r.canceled || !r.filePaths[0]) return { ok: false };
  keep([r.filePaths[0], ...own().filter(d => path.resolve(d) !== path.resolve(r.filePaths[0]))]);
  return { ok: true };
});
ipcMain.handle('dev:forget-folder', (e, dir) => { if (!fromIsland(e)) return null; keep(own().filter(d => d !== dir)); return { ok: true }; });
// stop a local server: only a pid that is in the list the island shows right now
ipcMain.handle('dev:stop', async (e, pid) => {
  if (!fromIsland(e) || !lastPorts.some(p => p.pid === Number(pid))) return { ok: false, error: 'unknown' };
  const out = await run('taskkill', ['/PID', String(Number(pid)), '/T', '/F'], 5000);
  return { ok: out != null };
});
// Docker: start / stop / restart a container of the list the island shows right now
ipcMain.handle('dev:docker', async (e, req) => {
  if (!fromIsland(e) || !lastContainers.some(c => c.id === req?.id) || !['start', 'stop', 'restart'].includes(req?.action)) return { ok: false };
  return { ok: (await run('docker', [req.action, req.id], 30000)) != null };
});
// open a project of the list in VS Code
ipcMain.handle('dev:open-code', (e, dir) => {
  if (!fromIsland(e) || !folders().includes(dir)) return { ok: false };
  const exe = vscode(); if (!exe) return { ok: false, error: 'VS Code' };
  require('node:child_process').spawn(exe, [dir], { detached: true, stdio: 'ignore', windowsHide: false }).unref();
  return { ok: true };
});
ipcMain.on('dev:watch', (e, on) => { if (fromIsland(e)) setWatch(on); });
app.on('will-quit', () => setWatch(false));

module.exports = { gitInfo, listening };
