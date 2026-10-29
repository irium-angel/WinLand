'use strict';
// The installer page (setup.html) and installer-main.cjs: only these few calls.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('setup', {
  install: choice => ipcRenderer.invoke('setup:install', choice),
  uninstall: choice => ipcRenderer.invoke('setup:uninstall', choice),
  onProgress: callback => ipcRenderer.on('setup:progress', (_e, data) => callback(data)),
  minimize: () => ipcRenderer.send('setup:minimize'),
  close: () => ipcRenderer.send('setup:close'),
  launch: () => ipcRenderer.send('setup:launch')
});
