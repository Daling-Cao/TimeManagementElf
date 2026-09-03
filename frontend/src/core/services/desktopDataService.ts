type StoredList = unknown[];

const TASKS_KEY = 'tasks';
const HISTORY_KEY = 'tomatoSessions';

function parseList(value: string | null): StoredList | null {
  if (value === null) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function reportSaveError(kind: string, error: unknown) {
  console.error(`保存${kind}到桌面数据文件失败:`, error);
}

export async function bootstrapDesktopData(): Promise<void> {
  const api = window.dataAPI;
  if (!api) return;

  const nativeSetItem = Storage.prototype.setItem;
  const nativeRemoveItem = Storage.prototype.removeItem;
  const loaded = await api.load();

  const localTasks = parseList(localStorage.getItem(TASKS_KEY));
  const localHistory = parseList(localStorage.getItem(HISTORY_KEY));

  if (loaded.tasks !== null) {
    nativeSetItem.call(localStorage, TASKS_KEY, JSON.stringify(loaded.tasks));
    await api.saveTasks(loaded.tasks);
  } else if (localTasks !== null) {
    await api.saveTasks(localTasks);
  } else {
    await api.saveTasks([]);
  }

  if (loaded.history !== null) {
    nativeSetItem.call(localStorage, HISTORY_KEY, JSON.stringify(loaded.history));
    await api.saveHistory(loaded.history);
  } else if (localHistory !== null) {
    await api.saveHistory(localHistory);
  } else {
    await api.saveHistory([]);
  }

  let tasksTimer: number | undefined;
  let historyTimer: number | undefined;

  const scheduleSave = (key: string, value: string | null) => {
    const list = parseList(value) ?? [];
    if (key === TASKS_KEY) {
      window.clearTimeout(tasksTimer);
      tasksTimer = window.setTimeout(() => {
        api.saveTasks(list).catch((error) => reportSaveError('任务', error));
      }, 150);
    } else if (key === HISTORY_KEY) {
      window.clearTimeout(historyTimer);
      historyTimer = window.setTimeout(() => {
        api.saveHistory(list).catch((error) => reportSaveError('历史', error));
      }, 150);
    }
  };

  Storage.prototype.setItem = function setItem(key: string, value: string) {
    nativeSetItem.call(this, key, value);
    if (this === localStorage && (key === TASKS_KEY || key === HISTORY_KEY)) {
      scheduleSave(key, value);
    }
  };

  Storage.prototype.removeItem = function removeItem(key: string) {
    nativeRemoveItem.call(this, key);
    if (this === localStorage && (key === TASKS_KEY || key === HISTORY_KEY)) {
      scheduleSave(key, null);
    }
  };

  api.onRootChanged(async () => {
    try {
      const next = await api.load();
      const tasks = next.tasks ?? [];
      const history = next.history ?? [];
      nativeSetItem.call(localStorage, TASKS_KEY, JSON.stringify(tasks));
      nativeSetItem.call(localStorage, HISTORY_KEY, JSON.stringify(history));
      window.dispatchEvent(new Event('focus'));
    } catch (error) {
      console.error('切换桌面数据文件夹失败:', error);
    }
  });
}
