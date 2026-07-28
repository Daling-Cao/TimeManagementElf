// Dev tool: render the pixel sprite frames in src/pet/sprites.json to PNG
// strips so the art can be reviewed/iterated without launching Electron.
//
//   node scripts/preview-sprites.mjs [outDir]
//
import { deflateSync } from 'node:zlib';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sprites = JSON.parse(
  readFileSync(join(here, '..', 'src', 'pet', 'sprites.json'), 'utf8'),
);
const outDir = process.argv[2] || '/opt/cursor/artifacts';
mkdirSync(outDir, { recursive: true });

// --- tiny RGBA PNG encoder ---------------------------------------------------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
function hexToRGBA(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
    255,
  ];
}

const palette = sprites.palette;
const size = sprites.size || 16;
const scale = 14;
const gap = 8;
const bg = [34, 40, 49, 255]; // dark slate so light pixels are visible

for (const [state, def] of Object.entries(sprites.states)) {
  const frames = def.frames;
  const fw = size * scale;
  const W = frames.length * fw + (frames.length + 1) * gap;
  const H = fw + gap * 2;
  const img = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) img.set(bg, i * 4);

  frames.forEach((frame, fi) => {
    if (frame.length !== size) console.warn(`${state} f${fi}: ${frame.length} rows (expected ${size})`);
    const ox = gap + fi * (fw + gap);
    const oy = gap;
    for (let ry = 0; ry < size; ry++) {
      const row = frame[ry] || '';
      if (row.length !== size) console.warn(`${state} f${fi} row ${ry}: len ${row.length}`);
      for (let rx = 0; rx < size; rx++) {
        const ch = row[rx] || '.';
        const hex = palette[ch];
        if (!hex) continue; // transparent -> keep bg
        const [r, g, b] = hexToRGBA(hex);
        for (let py = 0; py < scale; py++) {
          for (let px = 0; px < scale; px++) {
            const X = ox + rx * scale + px;
            const Y = oy + ry * scale + py;
            const idx = (Y * W + X) * 4;
            img[idx] = r; img[idx + 1] = g; img[idx + 2] = b; img[idx + 3] = 255;
          }
        }
      }
    }
  });

  const file = join(outDir, `sprite_${state}.png`);
  writeFileSync(file, encodePNG(W, H, img));
  console.log(`wrote ${file} (${frames.length} frames)`);
}
