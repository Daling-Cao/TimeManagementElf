const fs = require('node:fs');
const path = require('node:path');
const log = require('./logger.cjs');

let dataRoot = '';
let daysRoot = '';
let locationConfigFile = '';

function isDirectory(candidate) {
  try {
    return fs.statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

function readConfiguredRoot(defaultRoot) {
  if (!fs.existsSync(locationConfigFile)) return defaultRoot;
  try {
    const config = JSON.parse(fs.readFileSync(locationConfigFile, 'utf8'));
    return typeof config.dataRoot === 'string' && path.isAbsolute(config.dataRoot)
      ? path.resolve(config.dataRoot)
      : defaultRoot;
  } catch (error) {
    log.error('data', 'Could not read data location setting', {
      locationConfigFile,
      error,
    });
    return defaultRoot;
  }
}

function init(app) {
  const userDataRoot = app.getPath('userData');
  locationConfigFile = path.join(userDataRoot, 'data-location.json');
  const defaultRoot = path.join(userDataRoot, 'data');
  dataRoot = readConfiguredRoot(defaultRoot);
  if (fs.existsSync(dataRoot) && !isDirectory(dataRoot)) {
    log.error('data', 'Configured data path is not a directory; using default', {
      configuredRoot: dataRoot,
      defaultRoot,
    });
    dataRoot = defaultRoot;
  }
  daysRoot = path.join(dataRoot, 'days');
  fs.mkdirSync(daysRoot, { recursive: true });
  log.info('data', 'Data store initialized', { dataRoot });
  return dataRoot;
}

function copyMissingTree(source, target) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyMissingTree(from, to);
    } else if (entry.isFile() && !fs.existsSync(to)) {
      fs.copyFileSync(from, to);
    }
  }
}

function setDataRoot(selectedRoot) {
  assertInitialized();
  if (typeof selectedRoot !== 'string' || !path.isAbsolute(selectedRoot)) {
    throw new TypeError('The selected data folder must be an absolute path');
  }

  const nextRoot = path.resolve(selectedRoot);
  const currentRoot = path.resolve(dataRoot);
  if (nextRoot === currentRoot) return { dataRoot, changed: false };
  if (nextRoot.startsWith(`${currentRoot}${path.sep}`)) {
    throw new Error('不能把当前数据文件夹的子文件夹设为新的数据文件夹');
  }
  if (fs.existsSync(nextRoot) && !isDirectory(nextRoot)) {
    throw new Error('选择的路径不是文件夹');
  }

  fs.mkdirSync(nextRoot, { recursive: true });
  copyMissingTree(currentRoot, nextRoot);
  fs.writeFileSync(
    locationConfigFile,
    `${JSON.stringify({ dataRoot: nextRoot, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    'utf8',
  );

  const previousRoot = dataRoot;
  dataRoot = nextRoot;
  daysRoot = path.join(dataRoot, 'days');
  fs.mkdirSync(daysRoot, { recursive: true });
  log.info('data', 'Data folder changed', { previousRoot, dataRoot });
  return { dataRoot, previousRoot, changed: true };
}

function assertInitialized() {
  if (!dataRoot) throw new Error('Data store has not been initialized');
}

function localDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return localDate(new Date());
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    log.error('data', 'Failed to read JSON data file', { file, error });
    throw error;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, `${file}.bak`);
  }
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function envelope(key, value, date) {
  return {
    schemaVersion: 1,
    date,
    updatedAt: new Date().toISOString(),
    [key]: value,
  };
}

function loadAll() {
  assertInitialized();
  const tasksDocument = readJson(path.join(dataRoot, 'tasks.json'));
  const historyDocument = readJson(path.join(dataRoot, 'history.json'));
  const tasks = Array.isArray(tasksDocument?.tasks) ? tasksDocument.tasks : null;
  const history = Array.isArray(historyDocument?.history) ? historyDocument.history : null;
  log.info('data', 'Desktop data loaded', {
    taskCount: tasks?.length ?? null,
    historyCount: history?.length ?? null,
  });
  return { tasks, history, dataRoot };
}

function saveTasks(tasks) {
  assertInitialized();
  if (!Array.isArray(tasks)) throw new TypeError('Tasks must be an array');
  const date = localDate();
  const document = envelope('tasks', tasks, date);
  writeJson(path.join(dataRoot, 'tasks.json'), document);
  writeJson(path.join(daysRoot, date, 'tasks.json'), document);
  log.info('data', 'Tasks saved to master and daily files', {
    date,
    taskCount: tasks.length,
  });
  return { date, taskCount: tasks.length };
}

function sessionDate(session) {
  return localDate(
    session?.startTime || session?.started_at || session?.timestamp || new Date(),
  );
}

function saveHistory(history) {
  assertInitialized();
  if (!Array.isArray(history)) throw new TypeError('History must be an array');

  const date = localDate();
  writeJson(path.join(dataRoot, 'history.json'), envelope('history', history, date));

  const grouped = new Map();
  for (const session of history) {
    const key = sessionDate(session);
    const items = grouped.get(key) || [];
    items.push(session);
    grouped.set(key, items);
  }
  if (!grouped.has(date)) grouped.set(date, []);

  for (const [day, sessions] of grouped) {
    writeJson(
      path.join(daysRoot, day, 'history.json'),
      envelope('history', sessions, day),
    );
  }
  log.info('data', 'History saved to master and daily files', {
    historyCount: history.length,
    dayCount: grouped.size,
  });
  return { historyCount: history.length, dayCount: grouped.size };
}

function getDataRoot() {
  assertInitialized();
  return dataRoot;
}

module.exports = {
  init,
  loadAll,
  saveTasks,
  saveHistory,
  getDataRoot,
  setDataRoot,
};
