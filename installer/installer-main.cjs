'use strict';
// WinLand's own installer and uninstaller (setup.html draws them). Everything happens on this PC, for this user only
// (no administrator rights): WinLand goes to %LOCALAPPDATA%\Programs\WinLand, with shortcuts and an entry in
// "Installed apps". WinLand-Setup.exe (tools/winland-setup.cs) unpacks the app to a temporary folder and starts it
// with --winland-setup; the installed WinLand.exe starts it with --winland-uninstall.
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { execFile, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const UNINSTALL = process.argv.includes('--winland-uninstall');
const TARGET = path.join(process.env.LOCALAPPDATA || path.join(require('node:os').homedir(), 'AppData', 'Local'), 'Programs', 'WinLand');
const SOURCE = path.dirname(process.execPath); // the unpacked app (setup) or the installed one (uninstall)
const EXE = path.join(TARGET, 'WinLand.exe');
const USER_DATA = path.join(app.getPath('appData'), 'dynamic-winland'); // WinLand's settings (package name)
const PROGRAMS = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
const DESKTOP = app.getPath('desktop');
const UNINSTALL_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\WinLand';
const RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const version = (() => { try { return require('../package.json').version; } catch { return ''; } })();

app.setAppUserModelId(UNINSTALL ? 'local.winland.uninstall' : 'local.winland.setup');
// its own scratch folder, so a WinLand that is running (same app, same lock) does not stop the installer
app.setPath('userData', path.join(app.getPath('temp'), 'winland-setup'));
if (!app.requestSingleInstanceLock()) app.exit(0);

const run = (file, args) => new Promise(done => execFile(file, args, { windowsHide: true }, (error, stdout) => done(error ? null : String(stdout || ''))));
const reg = (...args) => run('reg.exe', args);
const powershell = script => run(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), ['-NoProfile', '-NonInteractive', '-Command', script]);

let win = null;
const send = (channel, data) => { if (win && !win.isDestroyed()) win.webContents.send(channel, data); };

// a WinLand that is running from the install folder is closed first (never this window or its own helpers)
async function closeRunning() {
  const me = process.pid, folder = TARGET.replace(/'/g, "''");
  await powershell(`Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like '${folder}\\*' -and $_.ProcessId -ne ${me} -and $_.ParentProcessId -ne ${me} } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`);
  // wait until they are really gone (a slower PC takes a few seconds to let go of the files)
  for (let i = 0; i < 20; i++) {
    const left = await powershell(`@(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like '${folder}\\*' -and $_.ProcessId -ne ${me} -and $_.ParentProcessId -ne ${me} }).Count`);
    if (!Number(String(left || '0').trim())) break;
    await new Promise(r => setTimeout(r, 500));
  }
  await new Promise(r => setTimeout(r, 700));
}

// One file, even when Windows still holds the old one for a moment (WinLand closing, an antivirus checking it):
// tries again for ~20 s, and as a last resort moves the old file aside (a file in use can still be renamed).
const LOCKED = new Set(['EPERM', 'EBUSY', 'EACCES']);
const wait = ms => new Promise(r => setTimeout(r, ms));
async function copyOne(from, to) {
  for (let i = 0; ; i++) {
    try { try { fs.chmodSync(to, 0o666); } catch {} await fs.promises.copyFile(from, to); return; }
    catch (error) {
      if (!LOCKED.has(error.code)) throw error;
      if (i === 25) { try { fs.renameSync(to, `${to}.old-${Date.now()}`); continue; } catch {} }
      if (i >= 40) { const e = new Error('locked'); e.code = 'locked'; e.file = path.basename(to); throw e; }
      await wait(i < 10 ? 300 : 700);
    }
  }
}
// the old files moved aside last time (they are free now)
function removeOld(dir) {
  let items = []; try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const item of items) { const p = path.join(dir, item.name); if (item.isDirectory()) removeOld(p); else if (/\.old-\d+$/.test(item.name)) try { fs.unlinkSync(p); } catch {} }
}

function listFiles(dir, base = dir, out = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) listFiles(p, base, out); else out.push({ rel: path.relative(base, p), size: fs.statSync(p).size });
  }
  return out;
}
function folderSizeKb(dir) { try { return Math.round(listFiles(dir).reduce((a, f) => a + f.size, 0) / 1024); } catch { return 0; } }

async function install(choice) {
  const step = (key, progress) => send('setup:progress', { key, progress });
  step('close', 0.01);
  await closeRunning();
  // 1. the files (most of the time), with real progress
  const files = listFiles(SOURCE), total = files.reduce((a, f) => a + f.size, 0) || 1;
  if (path.resolve(SOURCE).toLowerCase() !== path.resolve(TARGET).toLowerCase()) {
    let done = 0, last = 0;
    // an update: old app files go, your settings (in %APPDATA%) stay
    removeOld(TARGET);
    try { fs.rmSync(path.join(TARGET, 'resources', 'app'), { recursive: true, force: true }); } catch {}
    for (const f of files) {
      const to = path.join(TARGET, f.rel);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      await copyOne(path.join(SOURCE, f.rel), to);
      done += f.size;
      if (done - last > total / 200) { last = done; step('copy', 0.04 + 0.82 * done / total); }
    }
  }
  // 2. shortcuts: Start menu (WinLand also keeps it up to date itself) and, if you want, the desktop
  step('shortcuts', 0.88);
  const icon = path.join(TARGET, 'resources', 'app', 'assets', 'icon.ico');
  const link = { target: EXE, cwd: TARGET, icon, iconIndex: 0, appUserModelId: 'local.winland.island', description: 'WinLand : Pip, la Dynamic Island pour Windows' };
  fs.mkdirSync(PROGRAMS, { recursive: true });
  shell.writeShortcutLink(path.join(PROGRAMS, 'WinLand.lnk'), link);
  const desk = path.join(DESKTOP, 'WinLand.lnk');
  if (choice.desktop) shell.writeShortcutLink(desk, link); else try { fs.unlinkSync(desk); } catch {}
  // 3. "Installed apps": name, icon, version, size and how to uninstall
  step('register', 0.93);
  const values = { DisplayName: 'WinLand', DisplayIcon: icon, DisplayVersion: version, Publisher: 'WinLand', InstallLocation: TARGET,
    UninstallString: `"${EXE}" --winland-uninstall`, QuietUninstallString: `"${EXE}" --winland-uninstall` };
  for (const [name, value] of Object.entries(values)) await reg('add', UNINSTALL_KEY, '/v', name, '/t', 'REG_SZ', '/d', value, '/f');
  for (const [name, value] of Object.entries({ NoModify: 1, NoRepair: 1, EstimatedSize: folderSizeKb(TARGET) }))
    await reg('add', UNINSTALL_KEY, '/v', name, '/t', 'REG_DWORD', '/d', String(value), '/f');
  // 4. your choices: WinLand reads them once at its first start (tray-main.cjs, winland-fun.js)
  step('settings', 0.97);
  fs.mkdirSync(USER_DATA, { recursive: true });
  const first = { lang: choice.lang, theme: choice.theme, profile: choice.profile, autostart: !!choice.autostart };
  fs.writeFileSync(path.join(USER_DATA, 'first-run.json'), JSON.stringify(first));
  step('done', 1);
  return { ok: true };
}

async function uninstall(choice) {
  const step = (key, progress) => send('setup:progress', { key, progress });
  step('close', 0.05);
  await closeRunning();
  step('shortcuts', 0.3);
  for (const p of [path.join(PROGRAMS, 'WinLand.lnk'), path.join(PROGRAMS, 'WinLand Paramètres.lnk'), path.join(DESKTOP, 'WinLand.lnk')]) try { fs.unlinkSync(p); } catch {}
  step('register', 0.55);
  await reg('delete', UNINSTALL_KEY, '/f');
  // "start with Windows" (Electron's login item), only if it is this installed WinLand's
  if (String(await reg('query', RUN_KEY, '/v', 'local.winland.island') || '').toLowerCase().includes(EXE.toLowerCase())) await reg('delete', RUN_KEY, '/v', 'local.winland.island', '/f');
  await reg('delete', 'HKCU\\Software\\Classes\\AppUserModelId\\local.winland.island', '/f');
  await reg('delete', 'HKCU\\Software\\Classes\\AppUserModelId\\local.winland.settings', '/f');
  step('settings', 0.8);
  if (!choice.keepSettings) try { fs.rmSync(USER_DATA, { recursive: true, force: true }); } catch {}
  step('done', 1);
  return { ok: true };
}

app.whenReady().then(() => {
  let installed = null;
  try { installed = fs.existsSync(EXE) ? (JSON.parse(fs.readFileSync(path.join(TARGET, 'resources', 'app', 'package.json'), 'utf8')).version || '?') : null; } catch { installed = '?'; }
  win = new BrowserWindow({
    width: 880, height: 580, frame: false, transparent: true, resizable: false, maximizable: false, fullscreenable: false, show: false,
    backgroundColor: '#00000000', hasShadow: true, title: UNINSTALL ? 'Désinstaller WinLand' : 'Installer WinLand',
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    webPreferences: { preload: path.join(__dirname, 'setup-preload.cjs'), contextIsolation: true, sandbox: true }
  });
  win.loadFile(path.join(__dirname, 'setup.html'), { query: { mode: UNINSTALL ? 'uninstall' : 'install', version, installed: installed || '' } });
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { win = null; });
  const fromUs = e => e.sender === win?.webContents;
  ipcMain.handle('setup:install', async (e, choice) => { if (!fromUs(e) || UNINSTALL) return null; try { return await install(choice || {}); } catch (error) { return { ok: false, error: error.message, code: error.code === 'locked' || LOCKED.has(error.code) ? 'locked' : '', file: error.file || '' }; } });
  ipcMain.handle('setup:uninstall', async (e, choice) => { if (!fromUs(e) || !UNINSTALL) return null; try { return await uninstall(choice || {}); } catch (error) { return { ok: false, error: error.message }; } });
  ipcMain.on('setup:minimize', e => { if (fromUs(e)) win.minimize(); });
  ipcMain.on('setup:close', e => { if (fromUs(e)) finish(false); });
  ipcMain.on('setup:launch', e => { if (fromUs(e)) finish(true); });
});

async function finish(launch) {
  if (launch && fs.existsSync(EXE)) spawn(EXE, [], { cwd: TARGET, detached: true, stdio: 'ignore' }).unref();
  // The uninstaller runs from the folder it removes: a small command finishes the job once this app has quit,
  // trying again for ~30 s (Windows keeps a closing program's files locked a moment). Windows itself (WMI) starts
  // it, because a command started by this app would be stopped together with it.
  if (UNINSTALL && !fs.existsSync(path.join(PROGRAMS, 'WinLand.lnk')) && !launch) {
    const folder = TARGET.replace(/'/g, "''");
    const line = `cmd.exe /d /s /c "for /l %i in (1,1,15) do @(rmdir /s /q "${folder}" 2>nul & if exist "${folder}" ping -n 3 127.0.0.1 >nul)"`; // "if" takes the rest of the line
    await powershell(`$si = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ ShowWindow = [uint16]0 }; ` +
      `Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = '${line}'; CurrentDirectory = $env:TEMP; ProcessStartupInformation = $si } | Out-Null`);
  }
  app.quit();
}
app.on('window-all-closed', () => app.quit());
