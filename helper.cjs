'use strict';
// winland-helper.exe: one small program for the things that run all day (volume and the window in front, the music,
// Pip's eyes), instead of three PowerShell scripts of ~65-90 MB each. It is built here, on this PC, from
// helper/winland-helper.cs with the C# compiler that comes with Windows (.NET Framework 4): the first time WinLand
// starts, and again when the source changed. If that fails, the PowerShell scripts do the same job.
const { app } = require('electron');
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const WINDOWS = process.env.SystemRoot || 'C:\\Windows';
const FRAMEWORK = path.join(WINDOWS, 'Microsoft.NET', 'Framework64', 'v4.0.30319');
const METADATA = path.join(WINDOWS, 'System32', 'WinMetadata');
const POWERSHELL = path.join(WINDOWS, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
const SOURCE = path.join(__dirname, 'helper', 'winland-helper.cs');

let exe; // undefined: not tried yet; null: not available (use PowerShell)
function helper() {
  if (exe !== undefined) return exe;
  exe = null;
  if (process.platform !== 'win32') return exe;
  try {
    const dir = path.join(app.getPath('userData'), 'bin'), out = path.join(dir, 'winland-helper.exe'), stamp = out + '.source';
    const hash = crypto.createHash('sha1').update(fs.readFileSync(SOURCE)).digest('hex');
    let built = ''; try { built = fs.readFileSync(stamp, 'utf8'); } catch {}
    if (built !== hash || !fs.existsSync(out)) {
      fs.mkdirSync(dir, { recursive: true });
      execFileSync(path.join(FRAMEWORK, 'csc.exe'), ['-nologo', '-optimize+', '-target:exe', '-out:' + out,
        '-r:System.Drawing.dll', '-r:' + path.join(FRAMEWORK, 'System.Runtime.dll'),
        '-r:' + path.join(METADATA, 'Windows.Foundation.winmd'), '-r:' + path.join(METADATA, 'Windows.Media.winmd'), '-r:' + path.join(METADATA, 'Windows.Storage.winmd'),
        SOURCE], { windowsHide: true, timeout: 60000, stdio: 'pipe' });
      fs.writeFileSync(stamp, hash);
    }
    exe = out;
  } catch (error) {
    console.warn('[WinLand helper] build failed, using PowerShell:', String(error.stdout || error.message || error).slice(0, 400));
  }
  return exe;
}

// What to start for a mode: [file, args]. mode: watch | media | eyes; the script and its args are the fallback.
function command(mode, args, script, scriptArgs) {
  const h = helper();
  return h ? [h, [mode, ...args]]
    : [POWERSHELL, ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, script), ...scriptArgs]];
}

module.exports = { helper, command };
