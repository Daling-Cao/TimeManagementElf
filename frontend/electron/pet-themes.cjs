// 用户自定义的小猫动画主题。
//
// 存放位置：userData/pet-themes/<id>/
//   theme.json   { id, name, base, pixelated, files: { idle: 'idle-xxxx.gif', ... }, updatedAt }
//   <state>-<时间戳>.<ext>   用户上传的动画（文件名带时间戳，替换后页面不会读到旧缓存）
//
// 每个状态可以单独上传；没有上传的状态沿用 base（内置主题）的动画。
// 页面通过自定义协议 elf-theme://themes/<id>/<file> 读取文件（开发服务器和 file:// 都能用）。
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const log = require('./logger.cjs');

const SCHEME = 'elf-theme';
const STATES = ['idle', 'focus', 'celebrate', 'play'];
const MAX_BYTES = 20 * 1024 * 1024;
const ID_RE = /^custom-[a-z0-9]{4,32}$/;
const FILE_RE = /^(idle|focus|celebrate|play)-[a-z0-9]+\.(gif|png|webp|jpg)$/;

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

function readMeta(id) {
  const meta = JSON.parse(fs.readFileSync(path.join(themeDir(id), 'theme.json'), 'utf8'));
  const files = {};
  for (const state of STATES) {
    const file = meta.files && meta.files[state];
    if (typeof file === 'string' && FILE_RE.test(file)) files[state] = file;
  }
  return {
    id,
    name: String(meta.name || '我的主题'),
    base: String(meta.base || 'pixel'),
    pixelated: meta.pixelated !== false,
    files,
    updatedAt: Number(meta.updatedAt) || 0,
  };
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
  return {
    id: meta.id,
    name: meta.name,
    kind: 'custom',
    base: meta.base,
    pixelated: meta.pixelated,
    files,
    updatedAt: meta.updatedAt,
  };
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

function cleanName(name) {
  const text = String(name || '').trim().slice(0, 40);
  return text || '我的主题';
}

function create({ name, base, pixelated } = {}) {
  const id = `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  fs.mkdirSync(themeDir(id), { recursive: true });
  const meta = writeMeta({
    id,
    name: cleanName(name),
    base: String(base || 'pixel'),
    pixelated: pixelated !== false,
    files: {},
  });
  log.info('pet-themes', 'Theme created', { id, name: meta.name, base: meta.base });
  return toPublic(meta);
}

function update(id, patch = {}) {
  const meta = readMeta(id);
  if (patch.name !== undefined) meta.name = cleanName(patch.name);
  if (patch.base !== undefined) meta.base = String(patch.base || 'pixel');
  if (patch.pixelated !== undefined) meta.pixelated = !!patch.pixelated;
  return toPublic(writeMeta(meta));
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

function removeFile(id, file) {
  if (!file) return;
  try {
    fs.rmSync(path.join(themeDir(id), file), { force: true });
  } catch (error) {
    log.warn('pet-themes', 'Could not remove old file', { id, file, error });
  }
}

function setStateFile(id, state, data) {
  if (!STATES.includes(state)) throw new Error('无效的动画状态');
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data || []);
  if (bytes.length === 0) throw new Error('文件是空的');
  if (bytes.length > MAX_BYTES) throw new Error('文件太大（最大 20 MB）');
  const ext = detectExt(bytes);
  if (!ext) throw new Error('只支持 GIF / PNG(APNG) / WebP / JPG 图片');

  const meta = readMeta(id);
  const file = `${state}-${Date.now().toString(36)}.${ext}`;
  fs.writeFileSync(path.join(themeDir(id), file), bytes);
  removeFile(id, meta.files[state]);
  meta.files[state] = file;
  log.info('pet-themes', 'State animation uploaded', { id, state, file, bytes: bytes.length });
  return toPublic(writeMeta(meta));
}

function clearStateFile(id, state) {
  const meta = readMeta(id);
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
