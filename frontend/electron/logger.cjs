const fs = require('node:fs');
const path = require('node:path');

let currentLogPath = '';
let initialized = false;

function serialize(value) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      cause: value.cause ? serialize(value.cause) : undefined,
    };
  }
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

function init(app) {
  if (initialized) return currentLogPath;

  const logDir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  currentLogPath = path.join(logDir, `runtime-${stamp}-pid-${process.pid}.log`);
  initialized = true;

  info('app', 'Runtime log started', {
    logPath: currentLogPath,
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    nodeVersion: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    packaged: app.isPackaged,
    commandLine: process.argv,
  });
  return currentLogPath;
}

function write(level, scope, message, details) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
  };
  const serialized = serialize(details);
  if (serialized !== undefined) entry.details = serialized;
  const line = `${JSON.stringify(entry)}\n`;

  if (initialized && currentLogPath) {
    try {
      fs.appendFileSync(currentLogPath, line, 'utf8');
    } catch (error) {
      process.stderr.write(`[logger] Failed to write runtime log: ${error}\n`);
    }
  }

  const output = level === 'ERROR' ? process.stderr : process.stdout;
  output.write(`[${entry.timestamp}] [${level}] [${scope}] ${message}${
    serialized === undefined ? '' : ` ${JSON.stringify(serialized)}`
  }\n`);
}

const debug = (scope, message, details) => write('DEBUG', scope, message, details);
const info = (scope, message, details) => write('INFO', scope, message, details);
const warn = (scope, message, details) => write('WARN', scope, message, details);
const error = (scope, message, details) => write('ERROR', scope, message, details);

function getLogPath() {
  return currentLogPath;
}

module.exports = { init, debug, info, warn, error, getLogPath, serialize };
