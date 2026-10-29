'use strict';
// Software page (main process): the programs you use for your profile (FL Studio, Ableton, VS Code, Steam, Word…),
// only the ones installed on this PC. Found through the Start menu shortcuts (yours and everyone's), read here;
// nothing is fetched. The island can only start a program from this list, by its id, optionally with a file
// you dropped on it ("open with").
const { app, ipcMain, shell } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// [id, name shown, the shortcut name (without .lnk), category]
const CATALOG = [
  // music production
  ['fl', 'FL Studio', /^FL Studio\b/i, 'music'], ['ableton', 'Ableton Live', /^Ableton Live\b/i, 'music'],
  ['bitwig', 'Bitwig Studio', /^Bitwig Studio\b/i, 'music'], ['reaper', 'REAPER', /^REAPER\b/i, 'music'],
  ['cubase', 'Cubase', /^Cubase\b/i, 'music'], ['nuendo', 'Nuendo', /^Nuendo\b/i, 'music'],
  ['studioone', 'Studio One', /^(PreSonus )?Studio One\b/i, 'music'], ['protools', 'Pro Tools', /^Pro Tools\b/i, 'music'],
  ['reason', 'Reason', /^Reason \d+|^Reason$/i, 'music'], ['cakewalk', 'Cakewalk', /^Cakewalk\b/i, 'music'],
  ['lmms', 'LMMS', /^LMMS\b/i, 'music'], ['renoise', 'Renoise', /^Renoise\b/i, 'music'],
  ['audacity', 'Audacity', /^Audacity\b/i, 'music'], ['musescore', 'MuseScore', /^MuseScore\b/i, 'music'],
  ['melodyne', 'Melodyne', /^Melodyne\b/i, 'music'], ['rx', 'iZotope RX', /^(iZotope )?RX \d+ Audio Editor\b/i, 'music'],
  ['serato', 'Serato DJ', /^Serato (DJ|Studio)\b/i, 'music'], ['rekordbox', 'rekordbox', /^rekordbox\b/i, 'music'],
  ['traktor', 'Traktor', /^Traktor\b/i, 'music'], ['virtualdj', 'VirtualDJ', /^VirtualDJ\b/i, 'music'],
  ['nativeaccess', 'Native Access', /^Native Access\b/i, 'music'], ['kontakt', 'Kontakt', /^Kontakt\b/i, 'music'],
  ['splice', 'Splice', /^Splice$/i, 'music'], ['waves', 'Waves Central', /^Waves Central\b/i, 'music'],
  ['arturia', 'Arturia', /^Arturia Software Center\b/i, 'music'], ['voicemeeter', 'Voicemeeter', /^Voicemeeter\b/i, 'music'],
  // development
  ['vscode', 'VS Code', /^Visual Studio Code\b/i, 'dev'], ['cursor', 'Cursor', /^Cursor$/i, 'dev'],
  ['vs', 'Visual Studio', /^Visual Studio 20\d\d\b/i, 'dev'], ['claude', 'Claude', /^Claude$/i, 'dev'],
  ['intellij', 'IntelliJ IDEA', /^IntelliJ IDEA\b/i, 'dev'], ['pycharm', 'PyCharm', /^PyCharm\b/i, 'dev'],
  ['webstorm', 'WebStorm', /^WebStorm\b/i, 'dev'], ['rider', 'Rider', /^(JetBrains )?Rider\b/i, 'dev'],
  ['clion', 'CLion', /^CLion\b/i, 'dev'], ['goland', 'GoLand', /^GoLand\b/i, 'dev'], ['phpstorm', 'PhpStorm', /^PhpStorm\b/i, 'dev'],
  ['rustrover', 'RustRover', /^RustRover\b/i, 'dev'], ['datagrip', 'DataGrip', /^DataGrip\b/i, 'dev'],
  ['androidstudio', 'Android Studio', /^Android Studio\b/i, 'dev'], ['zed', 'Zed', /^Zed$/i, 'dev'],
  ['sublime', 'Sublime Text', /^Sublime Text\b/i, 'dev'], ['notepadpp', 'Notepad++', /^Notepad\+\+/i, 'dev'],
  ['docker', 'Docker Desktop', /^Docker Desktop\b/i, 'dev'], ['githubdesktop', 'GitHub Desktop', /^GitHub Desktop\b/i, 'dev'],
  ['gitbash', 'Git Bash', /^Git Bash$/i, 'dev'], ['postman', 'Postman', /^Postman$/i, 'dev'], ['insomnia', 'Insomnia', /^Insomnia$/i, 'dev'],
  ['dbeaver', 'DBeaver', /^DBeaver\b/i, 'dev'], ['unity', 'Unity Hub', /^Unity Hub\b/i, 'dev'], ['godot', 'Godot', /^Godot\b/i, 'dev'],
  // gaming
  ['steam', 'Steam', /^Steam$/i, 'gaming'], ['epic', 'Epic Games', /^Epic Games Launcher\b/i, 'gaming'],
  ['battlenet', 'Battle.net', /^Battle\.net\b/i, 'gaming'], ['ea', 'EA app', /^EA( app)?$/i, 'gaming'],
  ['ubisoft', 'Ubisoft Connect', /^Ubisoft Connect\b/i, 'gaming'], ['gog', 'GOG Galaxy', /^GOG GALAXY\b/i, 'gaming'],
  ['riot', 'Riot Client', /^Riot Client\b/i, 'gaming'], ['rockstar', 'Rockstar Games', /^Rockstar Games Launcher\b/i, 'gaming'],
  ['minecraft', 'Minecraft', /^Minecraft Launcher\b/i, 'gaming'], ['playnite', 'Playnite', /^Playnite\b/i, 'gaming'],
  ['discord', 'Discord', /^Discord$/i, 'gaming'], ['obs', 'OBS Studio', /^OBS Studio\b/i, 'gaming'], ['medal', 'Medal', /^Medal$/i, 'gaming'],
  ['nvidia', 'NVIDIA', /^NVIDIA (App|GeForce Experience)\b/i, 'gaming'], ['amd', 'AMD Software', /^AMD Software\b/i, 'gaming'],
  ['ghub', 'G HUB', /^Logitech G HUB\b/i, 'gaming'], ['steelseries', 'SteelSeries GG', /^SteelSeries GG\b/i, 'gaming'],
  ['razer', 'Razer Synapse', /^Razer Synapse\b/i, 'gaming'],
  // office
  ['word', 'Word', /^(Microsoft )?Word( 20\d\d)?$/i, 'office'], ['excel', 'Excel', /^(Microsoft )?Excel( 20\d\d)?$/i, 'office'],
  ['powerpoint', 'PowerPoint', /^(Microsoft )?PowerPoint( 20\d\d)?$/i, 'office'], ['outlook', 'Outlook', /^(Microsoft )?Outlook( 20\d\d)?( \(classic\))?$/i, 'office'],
  ['onenote', 'OneNote', /^(Microsoft )?OneNote( 20\d\d)?$/i, 'office'], ['access', 'Access', /^(Microsoft )?Access( 20\d\d)?$/i, 'office'],
  ['teams', 'Teams', /^(Microsoft )?Teams( \(work or school\)| classic)?$/i, 'office'],
  ['lowriter', 'LibreOffice Writer', /^LibreOffice Writer\b/i, 'office'], ['localc', 'LibreOffice Calc', /^LibreOffice Calc\b/i, 'office'],
  ['loimpress', 'LibreOffice Impress', /^LibreOffice Impress\b/i, 'office'], ['onlyoffice', 'ONLYOFFICE', /^ONLYOFFICE\b/i, 'office'],
  ['wps', 'WPS Office', /^WPS Office\b/i, 'office'], ['acrobat', 'Acrobat', /^(Adobe Acrobat|Acrobat Reader)\b/i, 'office'],
  ['notion', 'Notion', /^Notion$/i, 'office'], ['obsidian', 'Obsidian', /^Obsidian$/i, 'office'], ['evernote', 'Evernote', /^Evernote$/i, 'office'],
  ['thunderbird', 'Thunderbird', /^(Mozilla )?Thunderbird$/i, 'office'], ['zoom', 'Zoom', /^Zoom( Workplace)?$/i, 'office'],
  ['slack', 'Slack', /^Slack$/i, 'office']
];
const SKIP = /uninstall|d[ée]sinstall|readme|read me|help|manual|license|release notes|website|support|safe mode|\(x86\) uninstall|settings$/i;

// every .lnk of both Start menus (a few folders deep)
function shortcuts() {
  const roots = [path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs')];
  const found = [];
  const walk = (dir, depth) => {
    let items = []; try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const item of items) {
      const p = path.join(dir, item.name);
      if (item.isDirectory() && depth < 3) walk(p, depth + 1);
      else if (item.isFile() && /\.lnk$/i.test(item.name)) found.push(p);
    }
  };
  for (const root of roots) walk(root, 0);
  return found;
}

const version = name => Number((/(\d+(?:\.\d+)?)\s*$/.exec(name.replace(/\(.*?\)/g, '').trim()) || [])[1] || 0);
let cache = null, cachedAt = 0;
function scan() {
  if (cache && Date.now() - cachedAt < 5 * 60000) return cache;
  const byId = new Map();
  for (const lnk of shortcuts()) {
    const base = path.basename(lnk, '.lnk').trim();
    if (SKIP.test(base)) continue;
    const entry = CATALOG.find(([, , match]) => match.test(base)); if (!entry) continue;
    let target = '';
    try { target = shell.readShortcutLink(lnk).target || ''; } catch {}
    if (target && !fs.existsSync(target)) continue; // left behind by an uninstalled program
    const [id, name, , cat] = entry, have = byId.get(id);
    if (have && version(have.base) >= version(base)) continue; // FL Studio 2024 over FL Studio 21
    byId.set(id, { id, name, cat, lnk, target, base });
  }
  // Windows Terminal comes from the Store (no shortcut file), but leaves wt.exe in WindowsApps
  const wt = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps', 'wt.exe');
  if (fs.existsSync(wt)) byId.set('terminal', { id: 'terminal', name: 'Terminal', cat: 'dev', lnk: '', target: wt, base: 'Terminal' });
  const order = id => CATALOG.findIndex(e => e[0] === id);
  cache = [...byId.values()].sort((a, b) => order(a.id) - order(b.id)); cachedAt = Date.now();
  return cache;
}

const icons = new Map();
async function iconOf(item) {
  if (icons.has(item.id)) return icons.get(item.id);
  let url = '';
  for (const p of [item.target, item.lnk].filter(Boolean)) {
    try { const img = await app.getFileIcon(p, { size: 'large' }); if (!img.isEmpty()) { url = img.toDataURL(); break; } } catch {}
  }
  icons.set(item.id, url); return url;
}

const fromIsland = e => /mascot\.html/.test(e.senderFrame?.url || '');
ipcMain.handle('software:get', async (e, req) => {
  if (!fromIsland(e)) return null;
  if (req?.fresh) cache = null;
  const list = scan();
  return { ok: true, list: await Promise.all(list.map(async s => ({ id: s.id, name: s.name, cat: s.cat, icon: await iconOf(s) }))) };
});
ipcMain.handle('software:open', async (e, req) => {
  if (!fromIsland(e)) return null;
  const item = scan().find(s => s.id === req?.id); if (!item) return { ok: false, error: 'not found' };
  const file = typeof req?.file === 'string' ? req.file : '';
  if (file) { // open with: the program itself, with the file you dropped on it
    if (!path.isAbsolute(file) || !fs.existsSync(file) || !item.target || !/\.exe$/i.test(item.target)) return { ok: false, error: 'file' };
    spawn(item.target, [file], { cwd: path.dirname(item.target), detached: true, stdio: 'ignore', windowsHide: false }).unref();
    return { ok: true };
  }
  const problem = item.lnk ? await shell.openPath(item.lnk) : (spawn(item.target, [], { detached: true, stdio: 'ignore' }).unref(), '');
  return problem ? { ok: false, error: problem } : { ok: true };
});
