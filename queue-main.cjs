'use strict';
// Claude Code task queue (Claude dashboard, dashboard-ui.js): tasks you line up run one after another with your own
// Claude Code, without a window (claude -p, in the project's folder). File edits are allowed; anything else Claude
// would have to ask for is refused, so a queued task never does more than change files in its project.
// The queue is kept on this PC (queue.json), and the answers stay in it.
const { app, ipcMain, BrowserWindow } = require('electron');
const { spawn, execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const island = () => BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL()));
const fromIsland = e => /mascot\.html/.test(e.senderFrame?.url || '');
const file = () => path.join(app.getPath('userData'), 'queue.json');
let queue = []; try { queue = JSON.parse(fs.readFileSync(file(), 'utf8')); } catch {}
for (const t of queue) if (t.state === 'running') t.state = 'queued'; // WinLand was closed while it ran
let child = null, starting = false;
// stops Claude and everything it started (child.kill() would only stop cmd.exe, Claude would go on)
const stopChild = () => { if (child?.pid) execFile('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, () => {}); };
const save = () => { try { fs.writeFileSync(file(), JSON.stringify(queue.slice(-30))); } catch {} };
const view = () => ({ ok: true, tasks: queue.slice(-12).map(({ id, prompt, project, state, at, startedAt, endedAt, answer }) => ({ id, prompt, project: path.basename(project), state, at, startedAt, endedAt, answer: String(answer || '').slice(-600) })) });
const tell = () => { save(); island()?.webContents.send('queue:update', view()); };

let claudeExe; // where your Claude Code is
function findClaude() {
  if (claudeExe !== undefined) return Promise.resolve(claudeExe);
  const known = [path.join(app.getPath('home'), '.local', 'bin', 'claude.exe'), path.join(app.getPath('appData'), 'npm', 'claude.cmd')].find(p => fs.existsSync(p));
  if (known) return Promise.resolve(claudeExe = known);
  return new Promise(done => execFile('where.exe', ['claude'], { windowsHide: true }, (error, out) => done(claudeExe = error ? '' : String(out).split(/\r?\n/)[0].trim())));
}
async function next() {
  if (child || starting) return; // one task at a time, even when two are added at once
  const task = queue.find(t => t.state === 'queued'); if (!task) return;
  starting = true; const exe = await findClaude(); starting = false;
  if (!exe) { task.state = 'failed'; task.answer = 'Claude Code est introuvable sur ce PC.'; tell(); return next(); }
  if (!fs.existsSync(task.project)) { task.state = 'failed'; task.answer = 'Dossier introuvable.'; tell(); return next(); }
  task.state = 'running'; task.startedAt = Date.now(); task.answer = ''; tell();
  const args = ['-p', task.prompt, '--permission-mode', 'acceptEdits', '--output-format', 'text'];
  // no input (claude -p would wait for it); WINLAND_QUEUE tells WinLand's own hooks not to wait for an answer from the island
  const opts = { cwd: task.project, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, WINLAND_QUEUE: '1' } };
  child = /\.cmd$/i.test(exe) ? spawn('cmd.exe', ['/d', '/c', exe, ...args], opts) : spawn(exe, args, opts);
  child.stdout.on('data', d => { task.answer += d.toString(); if (task.answer.length > 20000) task.answer = task.answer.slice(-20000); });
  child.stderr.on('data', d => { task.err = (task.err || '') + d.toString(); });
  child.on('error', error => { task.err = error.message; });
  child.on('exit', code => {
    child = null; task.endedAt = Date.now();
    if (task.state === 'running') task.state = code === 0 ? 'done' : 'failed';
    if (task.state === 'failed' && !task.answer.trim()) task.answer = String(task.err || 'Erreur').slice(-600);
    tell(); island()?.webContents.send('queue:finished', { prompt: task.prompt, project: path.basename(task.project), ok: task.state === 'done' });
    next();
  });
}
ipcMain.handle('queue:get', e => fromIsland(e) ? view() : null);
ipcMain.handle('queue:add', (e, req) => {
  if (!fromIsland(e)) return null;
  const prompt = String(req?.prompt || '').trim().slice(0, 4000), project = String(req?.project || '');
  if (!prompt || !path.isAbsolute(project) || !fs.existsSync(project)) return { ok: false, error: 'project' };
  queue.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 6), prompt, project, state: 'queued', at: Date.now() });
  tell(); next(); return view();
});
ipcMain.handle('queue:remove', (e, req) => {
  if (!fromIsland(e)) return null;
  const t = queue.find(x => x.id === req?.id); if (!t) return view();
  if (t.state === 'running') { t.state = 'stopped'; stopChild(); } else queue = queue.filter(x => x !== t);
  tell(); return view();
});
ipcMain.handle('queue:clear', e => { if (!fromIsland(e)) return null; queue = queue.filter(t => t.state === 'queued' || t.state === 'running'); tell(); return view(); });
ipcMain.handle('queue:projects', e => { // the folders Claude Code / Codex worked in, and the Dev page's own
  if (!fromIsland(e)) return null;
  const dirs = new Map();
  for (const p of app.winlandMonitor?.projects?.() || []) if (p.cwd) dirs.set(p.cwd.toLowerCase(), p.cwd);
  try { for (const d of JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'dev.json'), 'utf8')).folders || []) dirs.set(d.toLowerCase(), d); } catch {}
  return { ok: true, projects: [...dirs.values()].filter(d => fs.existsSync(d)).map(d => ({ name: path.basename(d), path: d })) };
});
app.whenReady().then(() => setTimeout(next, 8000));
app.on('before-quit', stopChild);
