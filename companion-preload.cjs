'use strict';
// Pip on the desktop (companion.html) ↔ companion-main.cjs
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pipBridge', {
  onWorld: callback => ipcRenderer.on('pip:world', (_e, world) => callback(world)),
  hover: over => ipcRenderer.send('pip:hover', Boolean(over)),
  home: () => ipcRenderer.send('pip:home')
});
