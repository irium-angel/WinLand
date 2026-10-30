'use strict';
// Windows notifications only in the island (main process).
// While the option is on, every app's "show notification banners" switch (Windows Settings → Notifications) is
// turned off, so nothing pops up in the corner of the screen, and the helper takes each new notification out of
// the corner as soon as the island shows it. What each app had before is written down and put back when the
// option goes off or WinLand quits. A click on a notification in the island opens its app.
const { app, ipcMain, shell, BrowserWindow } = require('electron');
const { execFile, execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');

const REG = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'reg.exe');
const SETTINGS = 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings';
const PUSH = 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications';
const OWN = /winland|electron/i; // WinLand's own notifications keep their banner (they matter when the island is away)
const SYSTEM = /^(NOC_GLOBAL|QuietHours)/i; // values and keys of Windows itself, not apps

const island = () => BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL()));
const fromIsland = e => { try { return path.resolve(fileURLToPath(e.sender.getURL())).toLowerCase() === path.join(__dirname, 'mascot.html').toLowerCase(); } catch { return false; } };
const savedFile = () => path.join(app.getPath('userData'), 'notif-banners.json');
const readSaved = () => { try { const s = JSON.parse(fs.readFileSync(savedFile(), 'utf8')); return { toast: s.toast ?? null, apps: s.apps && typeof s.apps === 'object' ? s.apps : {} }; } catch { return { toast: null, apps: {} }; } };
const writeSaved = s => { try { if (s.toast == null && !Object.keys(s.apps).length) fs.rmSync(savedFile(), { force: true }); else fs.writeFileSync(savedFile(), JSON.stringify(s)); } catch {} };

const reg = args => new Promise(done => execFile(REG, args, { windowsHide: true, timeout: 8000 }, (error, out) => done(error ? '' : String(out))));
// every app Windows knows for notifications, with its ShowBanner value now (null: not set, so banners are on)
async function apps() {
  const keys = (await reg(['query', SETTINGS])).split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith(SETTINGS + '\\')).map(l => l.slice(SETTINGS.length + 1));
  const values = {}; let at = '';
  for (const line of (await reg(['query', SETTINGS, '/s', '/v', 'ShowBanner'])).split(/\r?\n/)) {
    const l = line.trim();
    if (l.startsWith(SETTINGS + '\\')) at = l.slice(SETTINGS.length + 1);
    else if (/^ShowBanner\s+REG_DWORD\s+0x/i.test(l) && at) values[at] = parseInt(l.split(/\s+/).pop(), 16);
  }
  // a nested key (PowerShell's id has backslashes) counts once, under its full name
  const all = new Set([...keys, ...Object.keys(values)]);
  return [...all].filter(k => !SYSTEM.test(k) && !OWN.test(k)).map(k => ({ id: k, banner: k in values ? values[k] : null }));
}
async function toastEnabled() { const m = /ToastEnabled\s+REG_DWORD\s+0x([0-9a-f]+)/i.exec(await reg(['query', PUSH, '/v', 'ToastEnabled'])); return m ? parseInt(m[1], 16) : null; }

// one .reg file for all of them: one reg.exe instead of one per app ("toast": only to put back a switch a test build changed)
const regFile = (banners, toast) => 'Windows Registry Editor Version 5.00\r\n\r\n' +
  Object.entries(banners).map(([id, v]) => `[${SETTINGS}\\${id}]\r\n"ShowBanner"=${v == null ? '-' : 'dword:' + Number(v).toString(16).padStart(8, '0')}\r\n`).join('\r\n') +
  (toast === undefined ? '' : `\r\n[${PUSH}]\r\n"ToastEnabled"=${toast == null ? '-' : 'dword:' + Number(toast).toString(16).padStart(8, '0')}\r\n`);
function importReg(text, sync) {
  const file = path.join(app.getPath('temp'), `winland-notif-${process.pid}.reg`);
  try { fs.writeFileSync(file, '\ufeff' + text, 'utf16le'); } catch { return Promise.resolve(); }
  const done = () => { try { fs.rmSync(file, { force: true }); } catch {} };
  if (sync) { try { execFileSync(REG, ['import', file], { windowsHide: true, timeout: 8000, stdio: 'ignore' }); } catch {} done(); return Promise.resolve(); }
  return new Promise(resolve => execFile(REG, ['import', file], { windowsHide: true, timeout: 8000 }, () => { done(); resolve(); }));
}

let only = false, busy = Promise.resolve();
async function turnOn() {
  const saved = readSaved(), off = {};
  for (const a of await apps()) { if (!(a.id in saved.apps)) saved.apps[a.id] = a.banner; if (a.banner !== 0) off[a.id] = 0; }
  writeSaved(saved); // first what to put back, then the change: a crash in between loses nothing
  if (Object.keys(off).length) await importReg(regFile(off));
  // notifications switched off for the whole PC (Windows Settings → Notifications): nothing reaches the island.
  // Windows only reads that switch when you sign in, so WinLand does not flip it: the island says so, once a start.
  if (await toastEnabled() === 0) island()?.webContents.send('notif:windows-off');
}
async function putBack(sync) {
  const saved = readSaved();
  if (!Object.keys(saved.apps).length && saved.toast == null) return;
  await importReg(regFile(saved.apps, saved.toast == null ? undefined : saved.toast), sync);
  writeSaved({ toast: null, apps: {} });
}
function set(on) {
  if (process.platform !== 'win32' || on === only) return;
  only = on; app.winlandHelper?.('notif-take ' + (on ? '1' : '0'));
  busy = busy.then(() => on ? turnOn() : putBack(false)).catch(() => {});
}
// a new app sends its first notification: no banner for it either
app.winlandNotifSeen = id => {
  if (!only || !id || OWN.test(id) || SYSTEM.test(id) || !/^[^\[\]\r\n"]+$/.test(id)) return;
  const saved = readSaved(); if (id in saved.apps) return;
  busy = busy.then(async () => {
    const s = readSaved(); if (id in s.apps) return;
    const m = /ShowBanner\s+REG_DWORD\s+0x([0-9a-f]+)/i.exec(await reg(['query', `${SETTINGS}\\${id}`, '/v', 'ShowBanner']));
    s.apps[id] = m ? parseInt(m[1], 16) : null; writeSaved(s);
    await importReg(regFile({ [id]: 0 }));
  }).catch(() => {});
};

ipcMain.on('notif:only-island', (e, on) => { if (fromIsland(e)) set(Boolean(on)); });
// the helper restarts now and then (it runs everything): it has to hear the choice again
setInterval(() => { if (only) app.winlandHelper?.('notif-take 1'); }, 10000);

// a click on a notification in the island: its app comes to the front (or starts)
ipcMain.handle('notif:open', async (e, req) => {
  if (!fromIsland(e)) return { ok: false };
  if (req?.settings) { shell.openExternal('ms-settings:notifications').catch(() => {}); return { ok: true }; } // the switch for all of Windows
  const name = String(req?.app || '').slice(0, 120), id = String(req?.aumid || '').slice(0, 300);
  if (name && app.winlandLaunch) { const r = await app.winlandLaunch.open('apps', name); if (r?.ok) return { ok: true }; }
  // a Store app (Teams, WhatsApp, Mail…): its id is "family!app", which the Start menu folder opens directly
  if (/^[\w.\-]+_[a-z0-9]+![\w.\-]+$/i.test(id)) {
    spawn(path.join(process.env.SystemRoot || 'C:\\Windows', 'explorer.exe'), [`shell:AppsFolder\\${id}`], { detached: true, stdio: 'ignore', windowsHide: false }).unref();
    return { ok: true };
  }
  return { ok: false };
});

// WinLand quits: every banner as it was (a crash is mended at the next start, from the saved file)
app.on('will-quit', () => { if (only) putBack(true); });
app.whenReady().then(() => { if (!only) busy = busy.then(() => putBack(false)).catch(() => {}); }); // left over from a crash: put back, the island turns it on again
module.exports = { set };
