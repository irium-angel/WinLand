'use strict';
// Builds WinLand.exe (tools/winland-launcher.cs) in the project folder with the C# compiler that comes with Windows.
// Runs after "bun install" and with "bun run build:exe". Nothing to do outside Windows.
const { execFileSync } = require('node:child_process');
const path = require('node:path');

if (process.platform !== 'win32') process.exit(0);
const root = path.join(__dirname, '..');
const csc = path.join(process.env.SystemRoot || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');
try {
  execFileSync(csc, ['-nologo', '-optimize+', '-target:winexe', '-out:' + path.join(root, 'WinLand.exe'),
    '-win32icon:' + path.join(root, 'assets', 'icon.ico'), '-r:System.Windows.Forms.dll', path.join(__dirname, 'winland-launcher.cs')], { stdio: 'pipe' });
  console.log('WinLand.exe is ready: double-click it to start WinLand.');
} catch (error) {
  console.warn('WinLand.exe could not be built (START-WINLAND.cmd still works):', String(error.stdout || error.message).slice(0, 400));
}
