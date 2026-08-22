const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  Menu,
  shell,
  dialog,
} = require('electron');
const path = require('node:path');
const log = require('./logger.cjs');
const dataStore = require('./data-store.cjs');

// In dev we load the Vite dev server (VITE_DEV_SERVER_URL is set by the
// `electron:dev` script); otherwise we load the built files from dist/.
const DEV_URL = process.env.VITE_DEV_SERVER_URL || '';
const isDev = !!DEV_URL;
const DIST = path.join(__dirname, '..', 'dist');

/** @type {BrowserWindow | null} */
let petWindow = null;
/** @type {BrowserWindow | null} */
let mainWindow = null;

const hasSingleInstanceLock = app.requestSingleInstanceLock();

// Theme list reported by the pet renderer (for the context menu).
let petThemes = [];
let petSelectedTheme = '';

function loadRoute(win, htmlFile) {
  log.info('navigation', 'Loading renderer entry', { htmlFile, isDev });
  if (isDev) {
    win.loadURL(`${DEV_URL}/${htmlFile}`).catch((error) =>
      log.error('navigation', 'Failed to load development URL', { htmlFile, error }),
    );
  } else {
    win.loadFile(path.join(DIST, htmlFile)).catch((error) =>
      log.error('navigation', 'Failed to load packaged file', { htmlFile, error }),
    );
  }
}

function monitorWindow(win, name) {
  log.info(name, 'Window created', {
    id: win.id,
    bounds: win.getBounds(),
    visible: win.isVisible(),
  });

  win.on('show', () => log.info(name, 'Window shown'));
  win.on('hide', () => log.info(name, 'Window hidden'));
  win.on('closed', () => log.info(name, 'Window closed'));
  win.on('unresponsive', () => log.warn(name, 'Window became unresponsive'));
  win.on('responsive', () => log.info(name, 'Window became responsive'));

  win.webContents.on('did-finish-load', () =>
    log.info(name, 'Renderer finished loading', { url: win.webContents.getURL() }),
  );
  win.webContents.on('did-navigate', (_event, url) =>
    log.info(name, 'Renderer navigated', { url }),
  );
  win.webContents.on('did-navigate-in-page', (_event, url, isMainFrame) =>
    log.info(name, 'Renderer navigated in page', { url, isMainFrame }),
  );
  win.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) =>
      log.error(name, 'Renderer failed to load', {
        errorCode,
        errorDescription,
        validatedURL,
        isMainFrame,
      }),
  );
  win.webContents.on('render-process-gone', (_event, details) =>
    log.error(name, 'Renderer process exited', details),
  );
  win.webContents.on('console-message', (event) => {
      const details = {
        level: event.level,
        message: event.message,
        lineNumber: event.lineNumber,
        sourceId: event.sourceId,
      };
      const level = String(details.level).toLowerCase();
      if (level === 'error') {
        log.error(`${name}:renderer`, 'Console message', details);
      } else if (level === 'warning' || level === 'warn') {
        log.warn(`${name}:renderer`, 'Console message', details);
      } else {
        log.info(`${name}:renderer`, 'Console message', details);
      }
    });
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

  monitorWindow(mainWindow, 'main-window');

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
    // 不抢键盘焦点，否则主窗口里任务标题输入框会打不出字
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  monitorWindow(petWindow, 'pet-window');

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
    log.info('main-window', 'Toggle requested: hide');
    mainWindow.hide();
  } else {
    log.info('main-window', 'Toggle requested: show');
    mainWindow.show();
    mainWindow.focus();
  }
}

function sendPetState(state) {
  log.info('pet-state', 'Sending state to pet renderer', state);
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('pet:state', state);
  }
}

function showPetMenu() {
  log.info('pet-menu', 'Opening context menu');
  const template = [
    { label: '打开 / 隐藏主界面', click: toggleMainWindow },
    { type: 'separator' },
    {
      label: '主题',
      submenu:
        petThemes.length > 0
          ? petThemes.map((t) => ({
              label: t.name,
              type: 'radio',
              checked: t.id === petSelectedTheme,
              click: () => {
                petSelectedTheme = t.id;
                sendPetState({ type: 'theme', id: t.id });
              },
            }))
          : [{ label: '（加载中…）', enabled: false }],
    },
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
      label: '打开运行日志',
      click: async () => {
        const logPath = log.getLogPath();
        log.info('logging', 'Open runtime log requested', { logPath });
        const errorMessage = await shell.openPath(logPath);
        if (errorMessage) {
          log.error('logging', 'Could not open runtime log', { logPath, errorMessage });
          shell.showItemInFolder(logPath);
        } else {
          log.info('logging', 'Runtime log opened successfully', { logPath });
        }
      },
    },
    {
      label: '打开数据文件夹',
      click: () => {
        const dataRoot = dataStore.getDataRoot();
        log.info('data', 'Open data folder requested', { dataRoot });
        shell.openPath(dataRoot).then((errorMessage) => {
          if (errorMessage) {
            log.error('data', 'Could not open data folder', { dataRoot, errorMessage });
          }
        });
      },
    },
    {
      label: '选择数据文件夹…',
      click: async () => {
        const currentRoot = dataStore.getDataRoot();
        const ownerWindow =
          mainWindow && mainWindow.isVisible() ? mainWindow : petWindow;
        const result = await dialog.showOpenDialog(ownerWindow, {
          title: '选择任务和历史数据保存文件夹',
          defaultPath: currentRoot,
          buttonLabel: '使用此文件夹',
          properties: ['openDirectory', 'createDirectory'],
        });
        if (result.canceled || !result.filePaths[0]) {
          log.info('data', 'Data folder selection cancelled');
          return;
        }

        try {
          const change = dataStore.setDataRoot(result.filePaths[0]);
          if (change.changed && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('data:root-changed', {
              dataRoot: change.dataRoot,
            });
          }
          log.info('data', 'Data folder selection completed', change);
        } catch (error) {
          log.error('data', 'Data folder selection failed', error);
          dialog.showErrorBox('无法使用这个文件夹', error.message || String(error));
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        log.info('app', 'Quit requested from pet context menu');
        app.isQuitting = true;
        app.quit();
      },
    },
  ];
  Menu.buildFromTemplate(template).popup({ window: petWindow ?? undefined });
}

ipcMain.on('pet:move', (_event, x, y) => {
  log.debug('ipc', 'pet:move', { x, y });
  if (petWindow) petWindow.setPosition(Math.round(x), Math.round(y));
});
ipcMain.on('main:toggle', toggleMainWindow);
ipcMain.on('pet:contextmenu', showPetMenu);
ipcMain.on('pet:themes', (_event, payload) => {
  petThemes = (payload && payload.themes) || [];
  petSelectedTheme = (payload && payload.selectedId) || '';
  log.info('themes', 'Pet themes reported', {
    selectedId: petSelectedTheme,
    themes: petThemes,
  });
});
ipcMain.on('pet:focus', (_event, active, title) => {
  log.info('timer', 'Focus state received', { active: !!active, title: title || '' });
  sendPetState({ type: 'focus', active: !!active, title: title || '' });
});
ipcMain.on('pet:celebrate', () => {
  log.info('timer', 'Completion celebration received');
  sendPetState({ type: 'celebrate' });
});
ipcMain.on('log:renderer-error', (event, details) => {
  const source = event.sender === petWindow?.webContents ? 'pet-window' : 'main-window';
  log.error(`${source}:renderer`, 'Unhandled renderer error', details);
});
ipcMain.handle('data:load', () => dataStore.loadAll());
ipcMain.handle('data:save-tasks', (_event, tasks) => dataStore.saveTasks(tasks));
ipcMain.handle('data:save-history', (_event, history) => dataStore.saveHistory(history));
ipcMain.handle('data:get-root', () => dataStore.getDataRoot());
ipcMain.on('app:quit', () => {
  log.info('app', 'Quit requested through IPC');
  app.isQuitting = true;
  app.quit();
});

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine, workingDirectory) => {
    log.warn('app', 'Second instance launch blocked', {
      commandLine,
      workingDirectory,
    });
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    } else if (petWindow && !petWindow.isDestroyed()) {
      petWindow.show();
      petWindow.focus();
    }
  });

  app.whenReady().then(() => {
    log.init(app);
    dataStore.init(app);
    log.info('app', 'Electron app ready with single-instance lock');
    createMainWindow();
    createPetWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
        createPetWindow();
      }
    });
  });
}

process.on('uncaughtException', (error) => {
  log.error('process', 'Uncaught exception', error);
});
process.on('unhandledRejection', (reason) => {
  log.error('process', 'Unhandled promise rejection', reason);
});
app.on('before-quit', () => log.info('app', 'before-quit'));
app.on('will-quit', () => log.info('app', 'will-quit'));

// The pet is a persistent desktop resident, so don't auto-quit when the main
// window is hidden/closed. Quit is triggered explicitly from the pet menu.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Windows are never all closed in normal use (pet stays), but guard anyway.
    if (app.isQuitting) app.quit();
  }
});
