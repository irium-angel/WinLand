// Every app is open (focus, tray, clipboard, note, music): everything is local, there is nothing to buy.
// The island still asks "which apps are open?", so the answer is simply: all of them.
const { ipcMain } = require('electron');

const PACK_APPS = { focus: ['focus', 'tray', 'clips', 'note'], music: ['spotify'], style: ['outfits'] };
const ALL = [...new Set(Object.values(PACK_APPS).flat())];

const view = () => ({ free: true, packs: Object.keys(PACK_APPS), apps: ALL, locked: [], code: '', packApps: PACK_APPS });

const ours = e => { const url = e.senderFrame?.url || ''; return url.startsWith('file:') && /(mascot|settings-app)\.html/.test(url); };
ipcMain.handle('license:get', e => ours(e) ? view() : null);

module.exports = { view, PACK_APPS };
