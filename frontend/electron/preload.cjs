const { contextBridge, ipcRenderer } = require('electron');

// Minimal, safe bridge for the desktop pet renderer.
contextBridge.exposeInMainWorld('petAPI', {
  toggleMain: () => ipcRenderer.send('main:toggle'),
  move: (x, y) => ipcRenderer.send('pet:move', x, y),
  contextMenu: () => ipcRenderer.send('pet:contextmenu'),
  quit: () => ipcRenderer.send('app:quit'),
});
