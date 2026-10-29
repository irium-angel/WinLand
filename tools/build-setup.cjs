'use strict';
// bun run build:setup → dist/WinLand-Setup.exe, all on this PC (nothing is downloaded):
// 1. dist/stage/WinLand: Electron (as WinLand.exe, with WinLand's icon and name) + the app in resources/app
// 2. payload.zip of that folder (Windows' own tar)
// 3. WinLand-Setup.exe (tools/winland-setup.cs) with the zip inside, compiled with the C# compiler of Windows
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

if (process.platform !== 'win32') { console.log('WinLand-Setup.exe is made on Windows.'); process.exit(0); }
const root = path.join(__dirname, '..'), dist = path.join(root, 'dist'), stage = path.join(dist, 'stage', 'WinLand');
const WINDOWS = process.env.SystemRoot || 'C:\\Windows', FRAMEWORK = path.join(WINDOWS, 'Microsoft.NET', 'Framework64', 'v4.0.30319');
const csc = (args) => execFileSync(path.join(FRAMEWORK, 'csc.exe'), ['-nologo', '-optimize+', ...args], { stdio: 'pipe', maxBuffer: 16 * 1024 * 1024 });
const mb = n => (n / 1048576).toFixed(0) + ' Mo';
const step = text => console.log('· ' + text);

// what the installed app needs (no node_modules: nothing is required from there; Codex comes from the PC itself)
const SKIP = new Set(['node_modules', '.git', '.claude', 'dist', 'tests', 'tools', 'WinLand.exe', 'bun.lock', '.gitignore', 'START-WINLAND.cmd', 'CONTROLE-WINDOWS.cmd', 'check-windows.cjs', 'site']);
const LOCALES = new Set(['en-US.pak', 'fr.pak']); // Chromium's own texts: only French and English

step('préparation du dossier');
fs.rmSync(path.join(dist, 'stage'), { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });
const electron = path.join(root, 'node_modules', 'electron', 'dist');
fs.cpSync(electron, stage, { recursive: true, filter: src => {
  const rel = path.relative(electron, src);
  if (rel === path.join('resources', 'default_app.asar')) return false;
  if (rel.startsWith('locales' + path.sep)) return LOCALES.has(path.basename(rel));
  return true;
} });
fs.renameSync(path.join(stage, 'electron.exe'), path.join(stage, 'WinLand.exe'));
const app = path.join(stage, 'resources', 'app');
for (const item of fs.readdirSync(root)) if (!SKIP.has(item)) fs.cpSync(path.join(root, item), path.join(app, item), { recursive: true });
// package.json without the scripts and dependencies that only matter while developing
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
fs.writeFileSync(path.join(app, 'package.json'), JSON.stringify({ name: pkg.name, version: pkg.version, description: pkg.description, main: pkg.main, type: pkg.type }, null, 2));

step('icône et nom de WinLand.exe');
const brand = path.join(dist, 'exe-brand.exe');
csc(['-target:exe', '-out:' + brand, path.join(__dirname, 'exe-brand.cs')]);
console.log('  ' + execFileSync(brand, [path.join(stage, 'WinLand.exe'), path.join(root, 'assets', 'icon.ico')], { encoding: 'utf8' }).trim());

step('compression');
const zip = path.join(dist, 'payload.zip');
fs.rmSync(zip, { force: true });
execFileSync(path.join(WINDOWS, 'System32', 'tar.exe'), ['-a', '-c', '-f', zip, '-C', path.join(dist, 'stage'), 'WinLand'], { stdio: 'pipe' });

step('WinLand-Setup.exe');
const out = path.join(dist, 'WinLand-Setup.exe');
csc(['-target:winexe', '-out:' + out, '-win32icon:' + path.join(root, 'assets', 'icon.ico'), '-resource:' + zip + ',payload.zip',
  '-r:System.Windows.Forms.dll', '-r:System.Drawing.dll', '-r:' + path.join(FRAMEWORK, 'System.IO.Compression.dll'), '-r:' + path.join(FRAMEWORK, 'System.IO.Compression.FileSystem.dll'),
  path.join(__dirname, 'winland-setup.cs')]);
fs.rmSync(zip, { force: true }); fs.rmSync(brand, { force: true });

const size = dir => fs.readdirSync(dir, { withFileTypes: true }).reduce((a, d) => a + (d.isDirectory() ? size(path.join(dir, d.name)) : fs.statSync(path.join(dir, d.name)).size), 0);
console.log(`\nWinLand-Setup.exe est prêt : ${out} (${mb(fs.statSync(out).size)}, ${mb(size(stage))} une fois installé)`);
