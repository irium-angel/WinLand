// The Stream Deck editor (deck-editor.html): the deck, the lists to choose from, and "try it" (deck-main.cjs).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('deckApp', {
  get: () => ipcRenderer.invoke('deck:get'),
  set: deck => ipcRenderer.invoke('deck:set', deck),
  reset: () => ipcRenderer.invoke('deck:reset'),
  lists: () => ipcRenderer.invoke('deck:lists'),
  tryAction: action => ipcRenderer.invoke('deck:try', action),
  logo: req => ipcRenderer.invoke('deck:logo', req), // { kind: 'app', name } or { path }
  pick: folder => ipcRenderer.invoke('deck:pick', { folder: folder === true }),
  scriptsFolder: () => ipcRenderer.invoke('deck:scripts-folder')
});
