const { contextBridge, ipcRenderer } = require('electron');

// Minimal, safe bridge for both the desktop pet renderer and the main window.
contextBridge.exposeInMainWorld('petAPI', {
  toggleMain: () => ipcRenderer.send('main:toggle'),
  move: (x, y) => ipcRenderer.send('pet:move', x, y),
  contextMenu: () => ipcRenderer.send('pet:contextmenu'),
  quit: () => ipcRenderer.send('app:quit'),
  // Main window -> pet state signals.
  setFocus: (active, title) => ipcRenderer.send('pet:focus', !!active, title || ''),
  celebrate: () => ipcRenderer.send('pet:celebrate'),
  // Pet window reports its theme list so the main process can build the menu.
  reportThemes: (payload) => ipcRenderer.send('pet:themes', payload),
  // Pet window subscribes to state messages forwarded by the main process.
  onState: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('pet:state', listener);
    return () => ipcRenderer.removeListener('pet:state', listener);
  },
});
