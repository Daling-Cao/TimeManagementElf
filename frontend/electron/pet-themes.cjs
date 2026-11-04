// 用户自定义的小猫动画主题。
//
// 存放位置：userData/pet-themes/<id>/
//   theme.json   {
//     id, name, base, pixelated,
//     size,                      默认显示大小（px）
//     files:   { <stateId>: 'idle-xxxx.gif' }   上传的动画
//     sizes:   { <stateId>: 160 }               单个状态的显示大小（覆盖 size）
//     motions: { <stateId>: 'breathe' }         附加的 CSS 动作
//     customStates: [{ id: 's-xxxx', name }]    用户新增的状态
//     behavior: { ... }                         何时显示哪个状态（见 cleanBehavior）
//     updatedAt
//   }
//   <stateId>-<时间戳>.<ext>   上传的文件（文件名带时间戳，替换后不会读到旧缓存）
//
// 四个内置状态没上传时沿用 base（内置主题）的动画；新增状态没上传时显示闲置动画。
// 页面通过自定义协议 elf-theme://themes/<id>/<file> 读取文件（开发服务器和 file:// 都能用）。
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const log = require('./logger.cjs');

const SCHEME = 'elf-theme';
const STANDARD_STATES = ['idle', 'focus', 'celebrate', 'play'];
const MOTIONS = ['none', 'breathe', 'bob', 'cheer', 'hop'];
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_CUSTOM_STATES = 20;
const MAX_RULES = 10;
const ID_RE = /^custom-[a-z0-9]{4,32}$/;
const STATE_ID_RE = /^(idle|focus|celebrate|play|s-[a-z0-9]{4,16})$/;
const FILE_RE = /^(idle|focus|celebrate|play|s-[a-z0-9]{4,16})-[a-z0-9]+\.(gif|png|webp|jpg)$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MIN_SIZE = 60;
const MAX_SIZE = 400;
const DEFAULT_SIZE = 190;

let root = '';

/** 必须在 app ready 之前调用。 */
function registerScheme(protocol) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
    },
  ]);
}

function init(app, protocol, net) {
  root = path.join(app.getPath('userData'), 'pet-themes');
  fs.mkdirSync(root, { recursive: true });
  protocol.handle(SCHEME, (request) => {
    try {
      const url = new URL(request.url);
      const [id, file] = decodeURIComponent(url.pathname).replace(/^\/+/, '').split('/');
      if (url.hostname !== 'themes' || !ID_RE.test(id || '') || !FILE_RE.test(file || '')) {
        return new Response('Not found', { status: 404 });
      }
      const filePath = path.join(root, id, file);
      if (!fs.existsSync(filePath)) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(filePath).toString());
    } catch (error) {
      log.error('pet-themes', 'Protocol request failed', { url: request.url, error });
      return new Response('Error', { status: 500 });
    }
  });
  log.info('pet-themes', 'Custom theme store ready', { root });
}

function themeDir(id) {
  if (!ID_RE.test(String(id || ''))) throw new Error('无效的主题 id');
  return path.join(root, id);
}

// ---------- 清洗（theme.json 和页面传来的数据都不完全可信） ----------
function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function cleanText(text, fallback, max = 20) {
  const value = String(text ?? '').trim().slice(0, max);
  return value || fallback;
}

function cleanCustomStates(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list.slice(0, MAX_CUSTOM_STATES)) {
    if (!item) continue;
    let id = String(item.id || '');
    if (!/^s-[a-z0-9]{4,16}$/.test(id) || seen.has(id)) {
      id = `s-${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 6)}`;
    }
    seen.add(id);
    out.push({ id, name: cleanText(item.name, '新状态') });
  }
  return out;
}

function stateOrEmpty(value, valid) {
  const id = String(value || '');
  return valid.has(id) ? id : '';
}

/**
 * behavior = {
 *   idle, focus,               必填：闲置 / 番茄钟进行中显示的状态
 *   paused, break,             可空：''= 暂停同专注、休息同闲置
 *   celebrate: { state, seconds }        一个番茄完成后
 *   random: [{ state, minMinutes, maxMinutes, seconds }]   闲置时随机出现
 *   schedule: [{ from, to, state }]      闲置时按时间段替换（可跨午夜）
 * }
 */
function cleanBehavior(input, valid) {
  const b = input && typeof input === 'object' ? input : {};
  const celebrate = b.celebrate && typeof b.celebrate === 'object' ? b.celebrate : {};
  const random = Array.isArray(b.random) ? b.random : [{ state: 'play' }];
  return {
    idle: stateOrEmpty(b.idle, valid) || 'idle',
    focus: stateOrEmpty(b.focus, valid) || 'focus',
    paused: stateOrEmpty(b.paused, valid),
    break: stateOrEmpty(b.break, valid),
    celebrate: {
      state: stateOrEmpty(celebrate.state, valid) || 'celebrate',
      seconds: clampNumber(celebrate.seconds, 1, 600, 6),
    },
    random: random
      .slice(0, MAX_RULES)
      .filter((r) => r && stateOrEmpty(r.state, valid))
      .map((r) => {
        const minMinutes = clampNumber(r.minMinutes, 1, 1440, 30);
        return {
          state: r.state,
          minMinutes,
          maxMinutes: Math.max(minMinutes, clampNumber(r.maxMinutes, 1, 1440, minMinutes + 15)),
          seconds: clampNumber(r.seconds, 1, 600, 6),
        };
      }),
    schedule: (Array.isArray(b.schedule) ? b.schedule : [])
      .slice(0, MAX_RULES)
      .filter((r) => r && TIME_RE.test(r.from) && TIME_RE.test(r.to) && stateOrEmpty(r.state, valid))
      .map((r) => ({ from: r.from, to: r.to, state: r.state })),
  };
}

function validStateIds(customStates) {
  return new Set([...STANDARD_STATES, ...customStates.map((s) => s.id)]);
}

function cleanMeta(id, raw) {
  const customStates = cleanCustomStates(raw.customStates);
  const valid = validStateIds(customStates);
  const files = {};
  const sizes = {};
  const motions = {};
  for (const state of valid) {
    const file = raw.files && raw.files[state];
    if (typeof file === 'string' && FILE_RE.test(file) && file.startsWith(`${state}-`)) {
      files[state] = file;
    }
    const size = raw.sizes && raw.sizes[state];
    if (size !== undefined && size !== null && size !== '') {
      sizes[state] = clampNumber(size, MIN_SIZE, MAX_SIZE, DEFAULT_SIZE);
    }
    const motion = raw.motions && raw.motions[state];
    if (MOTIONS.includes(motion)) motions[state] = motion;
  }
  return {
    id,
    name: cleanText(raw.name, '我的主题', 40),
    base: String(raw.base || 'pixel'),
    pixelated: raw.pixelated !== false,
    size: clampNumber(raw.size, MIN_SIZE, MAX_SIZE, DEFAULT_SIZE),
    files,
    sizes,
    motions,
    customStates,
    behavior: cleanBehavior(raw.behavior, valid),
    updatedAt: Number(raw.updatedAt) || 0,
  };
}

function readMeta(id) {
  const raw = JSON.parse(fs.readFileSync(path.join(themeDir(id), 'theme.json'), 'utf8'));
  return cleanMeta(id, raw || {});
}

function writeMeta(meta) {
  const next = { ...meta, updatedAt: Date.now() };
  fs.writeFileSync(path.join(themeDir(meta.id), 'theme.json'), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

/** 给页面用的结构：files 里直接是可加载的 URL。 */
function toPublic(meta) {
  const files = {};
  for (const [state, file] of Object.entries(meta.files)) {
    files[state] = `${SCHEME}://themes/${meta.id}/${file}`;
  }
  return { ...meta, kind: 'custom', files };
}

function list() {
  if (!root || !fs.existsSync(root)) return [];
  const themes = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !ID_RE.test(entry.name)) continue;
    try {
      themes.push(toPublic(readMeta(entry.name)));
    } catch (error) {
      log.warn('pet-themes', 'Skipping unreadable theme', { id: entry.name, error });
    }
  }
  // 先建的排前面
  return themes.sort((a, b) => a.id.localeCompare(b.id));
}

function create({ name, base, pixelated } = {}) {
  const id = `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  fs.mkdirSync(themeDir(id), { recursive: true });
  const meta = writeMeta(cleanMeta(id, { name, base, pixelated }));
  log.info('pet-themes', 'Theme created', { id, name: meta.name, base: meta.base });
  return toPublic(meta);
}

function removeFile(id, file) {
  if (!file) return;
  try {
    fs.rmSync(path.join(themeDir(id), file), { force: true });
  } catch (error) {
    log.warn('pet-themes', 'Could not remove old file', { id, file, error });
  }
}

/**
 * patch 可包含 name / base / pixelated / size / sizes / motions / customStates / behavior。
 * 删掉的自定义状态会连同它上传的文件一起删除。
 */
function update(id, patch = {}) {
  const current = readMeta(id);
  const raw = { ...current };
  for (const key of ['name', 'base', 'pixelated', 'size', 'sizes', 'motions', 'customStates', 'behavior']) {
    if (patch[key] !== undefined) raw[key] = patch[key];
  }
  const next = cleanMeta(id, raw);
  for (const [state, file] of Object.entries(current.files)) {
    if (next.files[state] !== file) removeFile(id, file);
  }
  return toPublic(writeMeta(next));
}

/** 按文件头判断格式，不信任文件名/后缀。 */
function detectExt(bytes) {
  const b = bytes;
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'gif';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return 'webp';
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  return '';
}

function assertState(meta, state) {
  if (!STATE_ID_RE.test(String(state || '')) || !validStateIds(meta.customStates).has(state)) {
    throw new Error('无效的动画状态');
  }
}

function setStateFile(id, state, data) {
  const meta = readMeta(id);
  assertState(meta, state);
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data || []);
  if (bytes.length === 0) throw new Error('文件是空的');
  if (bytes.length > MAX_BYTES) throw new Error('文件太大（最大 20 MB）');
  const ext = detectExt(bytes);
  if (!ext) throw new Error('只支持 GIF / PNG(APNG) / WebP / JPG 图片');

  const file = `${state}-${Date.now().toString(36)}.${ext}`;
  fs.writeFileSync(path.join(themeDir(id), file), bytes);
  removeFile(id, meta.files[state]);
  meta.files[state] = file;
  log.info('pet-themes', 'State animation uploaded', { id, state, file, bytes: bytes.length });
  return toPublic(writeMeta(meta));
}

function clearStateFile(id, state) {
  const meta = readMeta(id);
  assertState(meta, state);
  removeFile(id, meta.files[state]);
  delete meta.files[state];
  return toPublic(writeMeta(meta));
}

function remove(id) {
  fs.rmSync(themeDir(id), { recursive: true, force: true });
  log.info('pet-themes', 'Theme deleted', { id });
  return true;
}

function getRoot() {
  return root;
}

module.exports = {
  registerScheme,
  init,
  list,
  create,
  update,
  setStateFile,
  clearStateFile,
  remove,
  getRoot,
};
