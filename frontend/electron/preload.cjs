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

// 替代 window.confirm / alert：Windows 上 Electron 原生弹窗关闭后，页面输入框经常拿不到焦点，
// 表现为总结、新建任务等输入框"有时打不了字"。改由主进程弹框并在关闭后把焦点还给页面。
// 用同步 IPC，调用方可以像 confirm() 一样直接拿到布尔值。
contextBridge.exposeInMainWorld('dialogAPI', {
  confirm: (message) => ipcRenderer.sendSync('dialog:confirm', String(message)),
  alert: (message) => ipcRenderer.sendSync('dialog:alert', String(message)),
});

// 主窗口：显示自己，以及接收“每日规划”的检查/打开请求。
contextBridge.exposeInMainWorld('appAPI', {
  showMain: () => ipcRenderer.send('main:show'),
  onPlanCheck: (cb) => {
    const listener = (_event, payload) => cb(payload || {});
    ipcRenderer.on('plan:check', listener);
    return () => ipcRenderer.removeListener('plan:check', listener);
  },
  onPlanOpen: (cb) => {
    const listener = () => cb();
    ipcRenderer.on('plan:open', listener);
    return () => ipcRenderer.removeListener('plan:open', listener);
  },
});

// AI 助手：配置保存在主进程（key 加密），请求也由主进程发出，页面拿不到 key。
contextBridge.exposeInMainWorld('aiAPI', {
  getConfig: () => ipcRenderer.invoke('ai:get-config'),
  setConfig: (config) => ipcRenderer.invoke('ai:set-config', config),
  complete: (request) => ipcRenderer.invoke('ai:complete', request),
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
