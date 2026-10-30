// WinLand in the Windows tray (next to the clock): Pip's face, with a menu to open the island,
// start with Windows, restart and quit. The island itself has no taskbar button, so this is the
// place where you can always find and close WinLand. Also: only one WinLand runs at a time.
const { app, Tray, Menu, nativeImage, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

let tray = null;

function island() {
  return BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL()));
}

function openIsland() {
  const win = island(); if (!win) return;
  if (app.winlandIslandOff) { win.webContents.send('island:turn-on'); return; } // turned off in Settings: on again (it shows itself)
  if (win.isMinimized()) win.restore();
  win.showInactive();
  win.webContents.send('extras:shortcut', 'home');
}

// Start with Windows. During development WinLand runs as "electron.exe <folder>", so pass those along.
function loginOptions() { return app.isPackaged ? {} : { path: process.execPath, args: [app.getAppPath()] }; }
function startsWithWindows() { try { return app.getLoginItemSettings(loginOptions()).openAtLogin; } catch { return false; } }
function setStartsWithWindows(on) { try { app.setLoginItemSettings({ ...loginOptions(), openAtLogin: !!on }); } catch {} buildMenu(); }

function quit() { app.quit(); } // main.js shows the goodbye first
function restart() { app.relaunch(); app.quit(); }

// The first time WinLand runs it turns "start with Windows" on; after that it is your choice (Settings or this menu).
function firstStartLogin() {
  const fs = require('node:fs'), flag = path.join(app.getPath('userData'), 'login-default-done');
  const asked = firstRun()?.autostart; // the installer asked (also when it updates WinLand)
  if (fs.existsSync(flag) && typeof asked !== 'boolean') return;
  setStartsWithWindows(asked ?? true);
  try { fs.writeFileSync(flag, new Date().toISOString()); } catch {}
}

// What you picked in the installer (installer/): language, theme, profile, start with Windows. Read once.
const firstRunFile = () => path.join(app.getPath('userData'), 'first-run.json');
function firstRun() { try { return JSON.parse(require('node:fs').readFileSync(firstRunFile(), 'utf8')); } catch { return null; } }

// The menu speaks the island's language (the island tells us, preload.js setLang).
let lang = 'fr';
const WORDS = {
  fr: { open: 'Ouvrir l’island', settings: 'Paramètres', widgets: 'Widgets…', lock: 'Verrouiller les widgets', login: 'Démarrer avec Windows', restart: 'Redémarrer', quit: 'Quitter WinLand' },
  en: { open: 'Open the island', settings: 'Settings', widgets: 'Widgets…', lock: 'Lock the widgets', login: 'Start with Windows', restart: 'Restart', quit: 'Quit WinLand' }
};

function buildMenu() {
  if (!tray) return;
  const w = WORDS[lang];
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'WinLand', enabled: false },
    { type: 'separator' },
    { label: w.open, accelerator: 'Ctrl+Alt+1', registerAccelerator: false, click: openIsland },
    { label: w.settings, click: () => app.emit('winland-open-settings') },
    { label: w.widgets, click: () => app.winlandWidgets?.gallery() }, // desktop widgets (widgets-main.cjs)
    ...(app.winlandWidgets?.count() ? [{ label: w.lock, type: 'checkbox', checked: app.winlandWidgets.locked(), click: item => app.winlandWidgets.setLocked(item.checked) }] : []),
    { label: w.login, type: 'checkbox', checked: startsWithWindows(), click: item => setStartsWithWindows(item.checked) },
    { type: 'separator' },
    { label: w.restart, click: restart },
    { label: w.quit, click: quit }
  ]));
}

app.on('winland-tray-refresh', () => buildMenu()); // the widgets changed (their lock, their number)

if (!app.requestSingleInstanceLock()) {
  // WinLand already runs: that one opens its island, this one stops right away.
  app.exit(0);
} else {
  // "WinLand Instellingen" in the Start menu starts WinLand with --settings: then only that app opens.
  app.on('second-instance', (event, argv) => { if ((argv || []).includes('--settings')) app.emit('winland-open-settings'); else openIsland(); });
  app.setName('WinLand');
  app.whenReady().then(() => {
    // Windows shows the name and icon of a notification from a Start menu shortcut with the same app id.
    // Without it, notifications said "Electron". Made (or fixed) on every start, it costs nothing.
    if (process.platform === 'win32') {
      // Windows keeps a shortcut's picture in its icon cache by path, so a new logo never showed (the old WinLand
      // robot stayed on the taskbar). The shortcuts point to a copy named after its content: a new logo, a new path.
      const fs = require('node:fs'), crypto = require('node:crypto'), changed = [];
      const versioned = name => {
        const from = path.join(__dirname, 'assets', name);
        try {
          const data = fs.readFileSync(from), dir = path.join(app.getPath('userData'), 'icons');
          const to = path.join(dir, name.replace(/(\.\w+)$/, '-' + crypto.createHash('sha1').update(data).digest('hex').slice(0, 10) + '$1'));
          if (!fs.existsSync(to)) {
            fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(to, data); changed.push(name);
            for (const f of fs.readdirSync(dir)) if (f !== path.basename(to) && f.startsWith(name.replace(/\.\w+$/, '-')) && f.endsWith(path.extname(name))) try { fs.unlinkSync(path.join(dir, f)); } catch {}
          }
          return to;
        } catch { return from; }
      };
      const ICON = versioned('icon.ico'), SETTINGS_ICON = versioned('settings-icon.ico');
      const ICON_PNG = versioned('icon-256.png'), SETTINGS_PNG = versioned('settings-icon.png');
      try {
        const { shell } = require('electron');
        const programs = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
        const link = path.join(programs, 'WinLand.lnk');
        // An old "Electron" shortcut with WinLand's app id made every notification say "Electron". Only that one goes.
        const old = path.join(programs, 'Electron.lnk');
        try {
          const info = require('node:fs').existsSync(old) && shell.readShortcutLink(old);
          if (info && info.appUserModelId === 'local.winland.island' && path.resolve(info.target) === path.resolve(process.execPath)) require('node:fs').unlinkSync(old);
        } catch {}
        shell.writeShortcutLink(link, require('node:fs').existsSync(link) ? 'replace' : 'create', {
          target: process.execPath,
          args: app.isPackaged ? '' : `"${app.getAppPath()}"`,
          cwd: app.isPackaged ? path.dirname(process.execPath) : app.getAppPath(),
          icon: ICON, iconIndex: 0,
          appUserModelId: 'local.winland.island',
          description: 'WinLand : Pip, la Dynamic Island pour Windows'
        });
        // The second app: WinLand Instellingen, with its own icon and app id (its own button on the taskbar).
        const settingsLink = path.join(programs, 'WinLand Paramètres.lnk');
        shell.writeShortcutLink(settingsLink, require('node:fs').existsSync(settingsLink) ? 'replace' : 'create', {
          target: process.execPath,
          args: (app.isPackaged ? '' : `"${app.getAppPath()}" `) + '--settings',
          cwd: app.isPackaged ? path.dirname(process.execPath) : app.getAppPath(),
          icon: SETTINGS_ICON, iconIndex: 0,
          appUserModelId: 'local.winland.settings',
          description: 'WinLand Paramètres : connexions, Pip, apps et plus'
        });
        // and the taskbar, which also remembers pictures by app: told once when a logo changed
        if (changed.length) require('node:child_process').execFile(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'ie4uinit.exe'), ['-show'], { windowsHide: true }, () => {});
      } catch {}
      // The shortcut alone was not enough: Windows also reads the name and icon of notifications from
      // HKCU\Software\Classes\AppUserModelId\<app id>. Only WinLand's own key, in the user's own registry part.
      try {
        const { execFile } = require('node:child_process');
        const key = 'HKCU\\Software\\Classes\\AppUserModelId\\local.winland.island';
        const set = (name, value) => execFile('reg.exe', ['add', key, '/v', name, '/t', 'REG_SZ', '/d', value, '/f'], { windowsHide: true }, () => {});
        set('DisplayName', 'WinLand');
        set('IconUri', ICON_PNG);
        const key2 = 'HKCU\\Software\\Classes\\AppUserModelId\\local.winland.settings';
        execFile('reg.exe', ['add', key2, '/v', 'DisplayName', '/t', 'REG_SZ', '/d', 'WinLand Paramètres', '/f'], { windowsHide: true }, () => {});
        execFile('reg.exe', ['add', key2, '/v', 'IconUri', '/t', 'REG_SZ', '/d', SETTINGS_PNG, '/f'], { windowsHide: true }, () => {});
      } catch {}
    }
    const image = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
    tray = new Tray(image);
    tray.setToolTip('WinLand');
    tray.on('click', openIsland);
    firstStartLogin();
    buildMenu();
  });
  // the icon stays during the goodbye and goes when the app really stops
  app.on('will-quit', () => { try { tray?.destroy(); } catch {} tray = null; });

  // only the island itself may change these
  const fromIsland = e => /mascot\.html/.test(e.senderFrame?.url || '');
  ipcMain.handle('app:login-get', e => fromIsland(e) ? { ok: true, on: startsWithWindows() } : { ok: false });
  ipcMain.handle('app:login-set', (e, on) => { if (!fromIsland(e)) return { ok: false }; setStartsWithWindows(on); return { ok: true, on: startsWithWindows() }; });
  ipcMain.on('app:restart', e => { if (fromIsland(e)) restart(); });
  ipcMain.handle('app:first-run', e => { if (!fromIsland(e)) return null; const r = firstRun(); try { require('node:fs').unlinkSync(firstRunFile()); } catch {} return r; });
  ipcMain.on('app:lang', (e, l) => { if (!fromIsland(e) || !WORDS[l] || l === lang) return; lang = l; app.winlandLang = l; buildMenu(); }); // also for notifications made here (ai-monitor-main.cjs)
}

module.exports = { openIsland };
