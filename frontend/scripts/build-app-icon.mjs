// Generate a crisp Windows application icon directly from the built-in pixel
// cat. Keeping this deterministic means contributors do not need a graphics
// editor (or a checked-in binary icon) before packaging the app.
import { deflateSync } from 'node:zlib';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const frontendDir = join(here, '..');
const sprites = JSON.parse(
  readFileSync(join(frontendDir, 'src', 'pet', 'sprites.json'), 'utf8'),
);

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let k = 0; k < 8; k += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[n] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuffer, data]);
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 4 + 1);
    rows[rowOffset] = 0;
    rgba.copy(rows, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(rows)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function rgb(hex) {
  const value = hex.slice(1);
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

const iconSize = 256;
const spriteSize = sprites.size ?? 16;
const scale = 14;
const offset = Math.floor((iconSize - spriteSize * scale) / 2);
const pixels = Buffer.alloc(iconSize * iconSize * 4);
const frame = sprites.states.focus.frames[0];

for (let y = 0; y < spriteSize; y += 1) {
  for (let x = 0; x < spriteSize; x += 1) {
    const color = sprites.palette[frame[y][x]];
    if (!color) continue;
    const [red, green, blue] = rgb(color);
    for (let py = 0; py < scale; py += 1) {
      for (let px = 0; px < scale; px += 1) {
        const targetX = offset + x * scale + px;
        const targetY = offset + y * scale + py;
        const index = (targetY * iconSize + targetX) * 4;
        pixels[index] = red;
        pixels[index + 1] = green;
        pixels[index + 2] = blue;
        pixels[index + 3] = 255;
      }
    }
  }
}

const png = encodePng(iconSize, iconSize, pixels);
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);

const directoryEntry = Buffer.alloc(16);
directoryEntry[0] = 0; // 0 represents 256 px in the ICO format.
directoryEntry[1] = 0;
directoryEntry[2] = 0;
directoryEntry[3] = 0;
directoryEntry.writeUInt16LE(1, 4);
directoryEntry.writeUInt16LE(32, 6);
directoryEntry.writeUInt32LE(png.length, 8);
directoryEntry.writeUInt32LE(icoHeader.length + directoryEntry.length, 12);

const outputDir = join(frontendDir, 'build');
const outputFile = join(outputDir, 'icon.ico');
mkdirSync(outputDir, { recursive: true });
writeFileSync(outputFile, Buffer.concat([icoHeader, directoryEntry, png]));
console.log(`Generated ${outputFile}`);
