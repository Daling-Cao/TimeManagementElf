const { app, BrowserWindow, ipcMain, screen, Menu } = require('electron');
const path = require('node:path');

// In dev we load the Vite dev server (VITE_DEV_SERVER_URL is set by the
// `electron:dev` script); otherwise we load the built files from dist/.
const DEV_URL = process.env.VITE_DEV_SERVER_URL || '';
const isDev = !!DEV_URL;
const DIST = path.join(__dirname, '..', 'dist');

/** @type {BrowserWindow | null} */
let petWindow = null;
/** @type {BrowserWindow | null} */
let mainWindow = null;

function loadRoute(win, htmlFile) {
  if (isDev) {
    win.loadURL(`${DEV_URL}/${htmlFile}`);
  } else {
    win.loadFile(path.join(DIST, htmlFile));
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 780,
    minWidth: 640,
    minHeight: 480,
    show: false,
    title: '时间管理小精灵',
    backgroundColor: '#f9fafb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // Keep the pomodoro timer accurate even while the window is hidden.
      backgroundThrottling: false,
    },
  });

  loadRoute(mainWindow, 'index.html');

  // Closing the main window just hides it — the pet keeps living on the desktop.
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // The app uses some `target="_blank"` links for internal routes. Keep those
  // navigations inside the main window instead of spawning blank windows.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(DEV_URL) || url.startsWith('file://')) {
      mainWindow.show();
      mainWindow.loadURL(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

function createPetWindow() {
  const { width: screenW, height: screenH } =
    screen.getPrimaryDisplay().workAreaSize;
  const petW = 240;
  const petH = 240;

  petWindow = new BrowserWindow({
    width: petW,
    height: petH,
    x: screenW - petW - 24,
    y: screenH - petH - 12,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Keep the pet above normal windows (incl. most full-screen apps).
  petWindow.setAlwaysOnTop(true, 'screen-saver');

  // PET_FAST shortens the playful cooldown (for demos/tests).
  const fast = !!process.env.PET_FAST;
  if (isDev) {
    petWindow.loadURL(`${DEV_URL}/pet.html${fast ? '?fast' : ''}`);
  } else {
    petWindow.loadFile(path.join(DIST, 'pet.html'), fast ? { search: 'fast' } : undefined);
  }
}

function toggleMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function sendPetState(state) {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('pet:state', state);
  }
}

function showPetMenu() {
  const template = [
    { label: '打开 / 隐藏主界面', click: toggleMainWindow },
    { type: 'separator' },
    {
      label: '预览动作',
      submenu: [
        { label: '😴 闲置 · 睡觉', click: () => sendPetState({ type: 'preview', state: 'idle' }) },
        { label: '🐱 定时 · 猫头', click: () => sendPetState({ type: 'preview', state: 'focus' }) },
        { label: '🚩 完成 · 挥旗', click: () => sendPetState({ type: 'preview', state: 'celebrate' }) },
        { label: '✨ 调皮 · 蹦跳', click: () => sendPetState({ type: 'preview', state: 'play' }) },
      ],
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ];
  Menu.buildFromTemplate(template).popup({ window: petWindow ?? undefined });
}

ipcMain.on('pet:move', (_event, x, y) => {
  if (petWindow) petWindow.setPosition(Math.round(x), Math.round(y));
});
ipcMain.on('main:toggle', toggleMainWindow);
ipcMain.on('pet:contextmenu', showPetMenu);
ipcMain.on('pet:focus', (_event, active, title) =>
  sendPetState({ type: 'focus', active: !!active, title: title || '' }),
);
ipcMain.on('pet:celebrate', () => sendPetState({ type: 'celebrate' }));
ipcMain.on('app:quit', () => {
  app.isQuitting = true;
  app.quit();
});

app.whenReady().then(() => {
  createMainWindow();
  createPetWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      createPetWindow();
    }
  });
});

// The pet is a persistent desktop resident, so don't auto-quit when the main
// window is hidden/closed. Quit is triggered explicitly from the pet menu.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Windows are never all closed in normal use (pet stays), but guard anyway.
    if (app.isQuitting) app.quit();
  }
});
