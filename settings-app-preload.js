// The settings app (settings-app.html): the island's lists and clicks, the AI choice and Pip's live face.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('settingsApp', {
  get: req => ipcRenderer.invoke('settings-app:get', req),
  dirty: on => ipcRenderer.send('settings-app:dirty', !!on),
  theme: name => ipcRenderer.send('settings-app:theme', name),
  home: () => ipcRenderer.invoke('settings-app:home'),
  connections: () => ipcRenderer.invoke('settings-app:connections'),
  connect: (id, on) => ipcRenderer.invoke('settings-app:connect', { id, on }),
  widgets: () => ipcRenderer.send('settings-app:widgets'), // the desktop widgets' gallery
  // AI & Chat: the Codex sign-in Pip's chat can use (ai-account-main.cjs)
  ai: {
    get: check => ipcRenderer.invoke('ai-settings:get', { check: check === true }), // check: really ask Codex (can take a moment)
    chatgptLogin: () => ipcRenderer.invoke('ai-settings:chatgpt-login'),
    chatgptCancel: () => ipcRenderer.invoke('ai-settings:chatgpt-cancel'),
    chatgptLogout: () => ipcRenderer.invoke('ai-settings:chatgpt-logout')
  },
  onGoto: callback => { const fn = (_e, tab) => callback(tab); ipcRenderer.on('settings-app:goto', fn); return () => ipcRenderer.removeListener('settings-app:goto', fn); },
  onFace: callback => { const fn = (_e, url) => callback(url); ipcRenderer.on('settings-app:face', fn); return () => ipcRenderer.removeListener('settings-app:face', fn); }
});
