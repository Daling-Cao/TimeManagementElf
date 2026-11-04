const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  Menu,
  shell,
  dialog,
  powerMonitor,
} = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const log = require('./logger.cjs');
const dataStore = require('./data-store.cjs');
const ai = require('./ai.cjs');

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

// ---------- 应用设置（userData/app-settings.json） ----------
let settingsFile = '';

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsFile, 'utf8')) || {};
  } catch {
    return {};
  }
}

function writeSettings(patch) {
  try {
    const next = { ...readSettings(), ...patch };
    fs.writeFileSync(settingsFile, JSON.stringify(next, null, 2), 'utf8');
  } catch (error) {
    log.error('settings', 'Could not write app settings', { settingsFile, error });
  }
}

// ---------- 开机自动启动 ----------
// 只有打包后的 exe 才注册：开发模式下注册的会是 node_modules 里的 electron.exe，
// 开机时只会打开一个空的 Electron 欢迎页。
// portable 版运行时会被解压到临时目录，process.execPath 指向临时文件，
// 必须注册 electron-builder 提供的原始 exe 路径。
function autoLaunchTarget() {
  return {
    path: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath,
    args: ['--autostart'],
  };
}

function isAutoLaunchSupported() {
  return app.isPackaged && process.platform !== 'linux';
}

function isAutoLaunchEnabled() {
  if (!isAutoLaunchSupported()) return false;
  return app.getLoginItemSettings(autoLaunchTarget()).openAtLogin;
}

function setAutoLaunch(enabled) {
  writeSettings({ autoLaunch: enabled });
  if (!isAutoLaunchSupported()) {
    log.info('auto-launch', 'Skipped (only available in the packaged app)', { enabled });
    return;
  }
  const target = autoLaunchTarget();
  app.setLoginItemSettings({ openAtLogin: enabled, ...target });
  log.info('auto-launch', 'Login item updated', { enabled, ...target });
}

// 默认开启；用户在菜单里关掉后记住选择。每次启动都重新写一次，exe 换了位置也能跟上。
function initAutoLaunch() {
  if (readSettings().autoLaunch === false) return;
  setAutoLaunch(true);
}

// ---------- 每日规划 ----------
// 主进程只负责在“可能是新的一天”的时机通知页面检查（开机由页面自己检查）。
// 页面判断今天是否已经规划过，需要时自己弹出规划窗口并请求显示主窗口。
function requestPlanCheck(reason) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  log.info('daily-plan', 'Plan check requested', { reason });
  mainWindow.webContents.send('plan:check', { reason });
}

// 右键菜单打开某个页面：显示主窗口并让页面跳到对应路由（HashRouter）。
function openPage(route) {
  log.info('main-window', 'Open page requested', { route });
  showMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app:navigate', route);
  }
}

// 不在这里显示主窗口：页面要先判断窗口原本是否隐藏（决定规划弹窗是否单独显示、
// 关闭后是否收起），再自己调用 appAPI.showMain()。
function openPlanner() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('plan:open');
  }
}

// 任务搜索：同规划一样由页面判断窗口原本是否隐藏，再自己显示窗口。
function openSearch() {
  log.info('main-window', 'Task search requested');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('search:open');
  }
}

function initDailyPlanTriggers() {
  // 唤醒/解锁后稍等一会儿，等网络、显示器和窗口都恢复。
  powerMonitor.on('resume', () => setTimeout(() => requestPlanCheck('resume'), 3000));
  powerMonitor.on('unlock-screen', () =>
    setTimeout(() => requestPlanCheck('unlock-screen'), 1500),
  );
  // 一直不关机/不睡眠的电脑：每分钟检查一次，但只在用户正在使用电脑时提醒，
  // 免得半夜跨天时弹窗没人看。
  setInterval(() => {
    if (powerMonitor.getSystemIdleTime() < 120) requestPlanCheck('tick');
  }, 60_000);
}

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

function monitorWindow(win, name, htmlFile) {
  // 自动恢复：30 秒内最多尝试 3 次，避免开发服务器没起来时无限重载。
  let recoveries = 0;
  let lastRecoveryAt = 0;
  const recover = (reason) => {
    if (!htmlFile || win.isDestroyed()) return;
    if (Date.now() - lastRecoveryAt > 30_000) recoveries = 0;
    if (recoveries >= 3) return;
    recoveries += 1;
    lastRecoveryAt = Date.now();
    log.warn(name, reason, { htmlFile, attempt: recoveries });
    setTimeout(() => {
      if (!win.isDestroyed()) loadRoute(win, htmlFile);
    }, 500);
  };

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
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      log.error(name, 'Renderer failed to load', {
        errorCode,
        errorDescription,
        validatedURL,
        isMainFrame,
      });
      // 主框架加载失败（例如误跳到 file:///C:/tomato）会留下白屏，回到入口页。
      // -3 (ERR_ABORTED) 只是被新的导航打断，不需要处理。
      if (isMainFrame && errorCode !== -3) recover('Recovering from failed load');
    },
  );
  win.webContents.on('render-process-gone', (_event, details) => {
    log.error(name, 'Renderer process exited', details);
    // 渲染进程崩溃后窗口会一直白屏，自动重新加载入口页恢复。
    if (details.reason !== 'clean-exit') recover('Reloading renderer after crash');
  });
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
    // 不显示 File/Edit/View 菜单栏（按 Alt 仍可临时呼出）
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // Keep the pomodoro timer accurate even while the window is hidden.
      backgroundThrottling: false,
    },
  });

  monitorWindow(mainWindow, 'main-window', 'index.html');

  loadRoute(mainWindow, 'index.html');

  // Windows 注销/关机：放行关闭，否则下面的“关闭即隐藏”会挡住关机。
  mainWindow.on('session-end', () => {
    log.info('app', 'Windows session ending; allowing quit');
    app.isQuitting = true;
  });

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

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  // Windows 不允许后台程序抢焦点时，至少让任务栏图标闪烁提醒。
  if (!mainWindow.isFocused()) mainWindow.flashFrame(true);
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
    { label: '📅 规划今天', click: openPlanner },
    { label: '🔍 搜索任务', click: openSearch },
    { label: '📋 任务列表', click: () => openPage('/tasks') },
    { label: '🍅 番茄钟', click: () => openPage('/tomato') },
    { label: '📊 统计', click: () => openPage('/statistics') },
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
    {
      label: isAutoLaunchSupported() ? '开机自动启动' : '开机自动启动（仅打包版）',
      type: 'checkbox',
      enabled: isAutoLaunchSupported(),
      checked: isAutoLaunchEnabled(),
      click: (item) => setAutoLaunch(item.checked),
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
ipcMain.on('main:show', showMainWindow);
ipcMain.on('main:hide', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
});
ipcMain.on('main:is-visible', (event) => {
  event.returnValue = !!(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible());
});

// 主进程弹框代替渲染进程的 window.confirm/alert（后者关闭后输入框常常无法再获得焦点）。
function showDialogFor(event, options) {
  const win = BrowserWindow.fromWebContents(event.sender);
  const response = win
    ? dialog.showMessageBoxSync(win, { title: '时间管理小精灵', ...options })
    : dialog.showMessageBoxSync({ title: '时间管理小精灵', ...options });
  if (win && !win.isDestroyed()) {
    win.focus();
    win.webContents.focus();
  }
  return response;
}

ipcMain.on('dialog:confirm', (event, message) => {
  const response = showDialogFor(event, {
    type: 'question',
    message,
    buttons: ['确定', '取消'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });
  event.returnValue = response === 0;
});

ipcMain.on('dialog:alert', (event, message) => {
  showDialogFor(event, { type: 'info', message, buttons: ['确定'], noLink: true });
  event.returnValue = null;
});
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
ipcMain.handle('ai:get-config', () => ai.getPublicConfig());
ipcMain.handle('ai:set-config', (_event, config) => {
  try {
    return { ok: true, config: ai.setConfig(config) };
  } catch (error) {
    log.error('ai', 'Could not save AI config', error);
    return { ok: false, error: error.message || String(error) };
  }
});
ipcMain.handle('ai:complete', (_event, request) =>
  ai.complete({
    system: String((request && request.system) || ''),
    user: String((request && request.user) || ''),
    jsonSchema: request && request.jsonSchema ? request.jsonSchema : undefined,
  }),
);
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
    ai.init(app);
    settingsFile = path.join(app.getPath('userData'), 'app-settings.json');
    log.info('app', 'Electron app ready with single-instance lock', {
      autostart: process.argv.includes('--autostart'),
    });
    initAutoLaunch();
    createMainWindow();
    createPetWindow();
    initDailyPlanTriggers();

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
app.on('before-quit', () => {
  // 任何途径的退出（菜单、托盘、macOS Cmd+Q、系统关机）都不再被“关闭即隐藏”拦住。
  app.isQuitting = true;
  log.info('app', 'before-quit');
});
app.on('will-quit', () => log.info('app', 'will-quit'));

// The pet is a persistent desktop resident, so don't auto-quit when the main
// window is hidden/closed. Quit is triggered explicitly from the pet menu.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Windows are never all closed in normal use (pet stays), but guard anyway.
    if (app.isQuitting) app.quit();
  }
});
