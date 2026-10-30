'use strict';
// Pip on the desktop: he leaves the island and lives on your screen. A transparent window over the main screen that
// lets every click through, except on Pip himself. He walks on the taskbar, climbs onto the window in front, falls
// when it goes away, sleeps in a corner when nothing happens, and goes back to the island when you click him.
// Turned on from the island (palette "Pip sur le bureau", Settings → Pip takes care of you).
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('node:path');

let win = null, timer = null;
const island = () => BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL()));
const fromIsland = e => /mascot\.html/.test(e.senderFrame?.url || '');
const fromPip = e => win && !win.isDestroyed() && e.sender === win.webContents;

function open() {
  if (win && !win.isDestroyed()) return;
  const d = screen.getPrimaryDisplay();
  win = new BrowserWindow({
    x: d.bounds.x, y: d.bounds.y, width: d.bounds.width, height: d.bounds.height, frame: false, transparent: true, resizable: false, movable: false,
    skipTaskbar: true, focusable: false, hasShadow: false, show: false, alwaysOnTop: true, enableLargerThanScreen: true, backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'companion-preload.cjs'), contextIsolation: true, sandbox: true, backgroundThrottling: false }
  });
  win.setAlwaysOnTop(true, 'floating');
  win.setIgnoreMouseEvents(true, { forward: true }); // clicks go through, except on Pip (companion.html asks)
  win.loadFile(path.join(__dirname, 'companion.html'));
  win.once('ready-to-show', () => win.showInactive());
  win.on('closed', () => { win = null; clearInterval(timer); timer = null; });
  // where he can stand: the taskbar's top edge and the top of the window in front
  timer = setInterval(async () => {
    if (!win || win.isDestroyed()) return;
    const area = screen.getPrimaryDisplay().workArea, rect = await app.winlandFrontRect?.(process.pid).catch(() => null);
    const cursor = screen.getCursorScreenPoint();
    win.webContents.send('pip:world', { floor: area.y + area.height - d.bounds.y, left: area.x - d.bounds.x, right: area.x + area.width - d.bounds.x,
      shelf: rect ? { x: rect.x - d.bounds.x, y: rect.y - d.bounds.y, width: rect.width } : null, mouse: { x: cursor.x - d.bounds.x, y: cursor.y - d.bounds.y },
      idle: require('electron').powerMonitor.getSystemIdleTime() });
  }, 400);
}
function close() { if (win && !win.isDestroyed()) win.close(); win = null; }
ipcMain.handle('pip:desk', (e, on) => { if (!fromIsland(e)) return null; if (on) open(); else close(); return { ok: true, on: Boolean(win) }; });
ipcMain.on('pip:hover', (e, over) => { if (fromPip(e)) win.setIgnoreMouseEvents(!over, { forward: true }); });
ipcMain.on('pip:home', e => { if (!fromPip(e)) return; close(); island()?.webContents.send('pip:home'); }); // clicked: back to the island
app.on('before-quit', close);
