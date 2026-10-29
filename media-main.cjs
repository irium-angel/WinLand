'use strict';
// Music from any app (main process). Windows keeps a "media session" for every app that plays something:
// Spotify, Apple Music, Deezer, TIDAL, Amazon Music, a browser tab with YouTube Music or Deezer web...
// winland-helper.exe (helper.cjs; media-session.ps1 as a fallback) reads the one that plays and presses its buttons,
// so no account or API key is needed.
// The island still talks over the old spotify:* channels (preload.js), so its music screens stay the same.
const { ipcMain, shell } = require('electron');
const { spawn, execFile } = require('node:child_process');
const path = require('node:path');

// A friendly name for the app id Windows gives (a packaged app id, or an .exe name for normal apps).
const APPS = [
  [/spotify/i, 'Spotify', 'spotify:'], [/applemusic|appleinc\./i, 'Apple Music'], [/deezer/i, 'Deezer', 'deezer:'],
  [/tidal/i, 'TIDAL', 'tidal:'], [/amazon.*music/i, 'Amazon Music'], [/youtube.*music|ytmusic/i, 'YouTube Music'],
  [/soundcloud/i, 'SoundCloud'], [/qobuz/i, 'Qobuz'], [/zunemusic|media\s*player/i, 'Lecteur multimédia'], [/vlc/i, 'VLC'],
  [/foobar/i, 'foobar2000'], [/itunes/i, 'iTunes'], [/msedge/i, 'Edge'], [/chrome/i, 'Chrome'], [/firefox/i, 'Firefox'],
  [/opera/i, 'Opera'], [/brave/i, 'Brave'], [/arc\b/i, 'Arc']
];
function appInfo(id) {
  const found = APPS.find(([re]) => re.test(id || ''));
  return { name: found ? found[1] : String(id || '').replace(/\.exe$/i, '').replace(/^.*[\\!]/, '') || 'Musique', link: found?.[2] || '' };
}

let child = null, nextId = 1, buffer = '';
const waiting = new Map();
function start() {
  if (child || process.platform !== 'win32') return child;
  const [file, args] = require('./helper.cjs').command('media', [], 'media-session.ps1', []); // winland-helper.exe, or the script
  child = spawn(file, args,
    { windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'ignore'] });
  child.stdin.on('error', () => {});
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    buffer += chunk;
    let end; while ((end = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, end).trim(); buffer = buffer.slice(end + 1);
      const space = line.indexOf(' ');
      if (line.slice(0, space) === 'push') { // the player changed: tell the island now, it does not wait to ask
        try { pushToIsland(shape(JSON.parse(line.slice(space + 1)))); } catch {}
        continue;
      }
      const job = waiting.get(line.slice(0, space));
      if (!job) continue;
      waiting.delete(line.slice(0, space)); clearTimeout(job.timer);
      try { job.resolve(JSON.parse(line.slice(space + 1))); } catch { job.resolve({ ok: false, error: 'bad answer' }); }
    }
  });
  child.on('exit', () => {
    child = null; buffer = ''; cover = ''; // a new helper sends the cover again
    for (const job of waiting.values()) { clearTimeout(job.timer); job.resolve({ ok: false, error: 'stopped' }); }
    waiting.clear();
  });
  return child;
}
function ask(command) {
  if (!start()) return Promise.resolve({ ok: false, error: 'Windows only' });
  return new Promise(resolve => {
    const id = String(nextId++);
    const timer = setTimeout(() => { waiting.delete(id); resolve({ ok: false, error: 'timeout' }); }, 6000);
    waiting.set(id, { resolve, timer });
    child.stdin.write(`${id} ${command}\n`);
  });
}

// The helper sends the cover only when the song changes: keep it here.
let cover = '', lastApp = '';
async function getState() { return shape(await ask('state')); }
function pushToIsland(state) {
  const win = require('electron').BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL()));
  win?.webContents.send('media:changed', state);
}
// the helper's answer in the shape the island knows (the old Spotify state)
function shape(r) {
  if (!r.ok) return { ok: false, connected: true, active: false, error: r.error };
  if (!r.active) return { ok: true, connected: true, active: false, is_playing: false, progress_ms: 0, duration_ms: 0, track: null };
  if (r.cover !== undefined) cover = r.cover;
  lastApp = r.app || '';
  const source = appInfo(r.app);
  return {
    ok: true, connected: true, active: true, is_playing: Boolean(r.playing),
    progress_ms: Number(r.position) || 0, duration_ms: Number(r.duration) || 0, can_seek: Boolean(r.canSeek),
    track: { id: r.song || '', name: r.title || source.name, artist: r.artist || '', album: r.album || '', image_url: cover },
    // the island shows the app where it plays (was: the Spotify Connect device)
    device: { id: r.app || '', name: source.name, type: 'Computer', active: true, here: true },
    source: source.name
  };
}

async function control(action) {
  if (action === 'open') return openApp();
  if (!['play', 'pause', 'next', 'previous'].includes(action)) return { ok: false, error: 'Action inconnue.' };
  const r = await ask(action);
  return r.ok ? { ok: true } : { ok: false, error: r.error || 'Le lecteur ne répond pas.' };
}

async function seek(ms) {
  const r = await ask('seek ' + Math.max(0, Math.round(Number(ms) || 0)));
  return r.ok ? { ok: true } : { ok: false, error: r.error || 'Ce lecteur ne permet pas de se déplacer dans le morceau.' };
}

// Bring the music app to the front: packaged apps (Apple Music, Spotify from the Store...) by their app id,
// the others by their own link (spotify:, deezer:...).
async function openApp() {
  const source = appInfo(lastApp);
  if (/!/.test(lastApp) && /^[\w.\-!]+$/.test(lastApp)) {
    execFile('explorer.exe', ['shell:AppsFolder\\' + lastApp], { windowsHide: true }, () => {});
    return { ok: true };
  }
  if (source.link) { try { await shell.openExternal(source.link); } catch {} }
  return { ok: true };
}

const fromIsland = e => /mascot\.html/.test(e.senderFrame?.url || '');
ipcMain.handle('spotify:get-state', e => fromIsland(e) ? getState() : null);
ipcMain.handle('spotify:control', (e, action) => fromIsland(e) ? control(action) : null);
ipcMain.handle('spotify:seek', (e, ms) => fromIsland(e) ? seek(ms) : null);
// nothing to link any more: every music app is found by itself
ipcMain.handle('spotify:connect', () => ({ ok: true }));
ipcMain.handle('spotify:disconnect', () => ({ ok: true }));

require('electron').app.on('will-quit', () => { try { child?.kill(); } catch {} });

// start watching right away, so the first change already arrives live
require('electron').app.whenReady().then(() => setTimeout(start, 1500));

module.exports = { appInfo, getState, shape };
