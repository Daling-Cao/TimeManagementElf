const { contextBridge, ipcRenderer } = require('electron');

function errorDetails(kind, value) {
  if (value instanceof Error) {
    return { kind, name: value.name, message: value.message, stack: value.stack };
  }
  return { kind, message: String(value) };
}

window.addEventListener('error', (event) => {
  ipcRenderer.send('log:renderer-error', {
    kind: 'window.error',
    message: event.message,
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
    stack: event.error?.stack,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  ipcRenderer.send('log:renderer-error', errorDetails('unhandledrejection', event.reason));
});

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

contextBridge.exposeInMainWorld('dataAPI', {
  load: () => ipcRenderer.invoke('data:load'),
  saveTasks: (tasks) => ipcRenderer.invoke('data:save-tasks', tasks),
  saveHistory: (history) => ipcRenderer.invoke('data:save-history', history),
  getRoot: () => ipcRenderer.invoke('data:get-root'),
  onRootChanged: (cb) => {
    const listener = (_event, payload) => cb(payload);
    ipcRenderer.on('data:root-changed', listener);
    return () => ipcRenderer.removeListener('data:root-changed', listener);
  },
});
