'use strict';
// The desktop widgets and their gallery talk to WinLand only through this (widgets-main.cjs checks who asks).
const { contextBridge, ipcRenderer } = require('electron');

const listen = (channel, callback) => {
  const handler = (_event, data) => callback(data);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('wl', {
  // a widget
  get: id => ipcRenderer.invoke('widget:get', String(id)),
  onUpdate: callback => listen('widget:update', callback),
  menu: id => ipcRenderer.send('widget:menu', String(id)),
  remove: id => ipcRenderer.send('widget:remove', String(id)),
  act: kind => ipcRenderer.send('widget:act', String(kind)),
  open: id => ipcRenderer.send('widget:open', String(id)),
  note: (id, text) => ipcRenderer.send('widget:note', { id: String(id), text: String(text).slice(0, 4000) }),
  // the gallery
  list: () => ipcRenderer.invoke('widgets:list'),
  onChanged: callback => listen('widgets:changed', callback),
  add: (kind, size, opts) => ipcRenderer.invoke('widgets:add', { kind: String(kind), size: String(size), opts: opts || {} }),
  update: (id, patch) => ipcRenderer.invoke('widgets:update', { id: String(id), patch: patch || {} }),
  removeItem: id => ipcRenderer.invoke('widgets:remove', String(id)),
  setPrefs: prefs => ipcRenderer.invoke('widgets:prefs', { on: prefs?.on, locked: prefs?.locked }),
  pickImage: () => ipcRenderer.invoke('widgets:pick-image')
});
