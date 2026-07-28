// Dev tool: turn the built-in pixel frames (src/pet/sprites.json) into a set of
// looping, transparent animated GIFs — one per state — so we ship a working
// example "GIF theme" and a template for user-made themes.
//
//   npm run themes:gif
//
import gifenc from 'gifenc';
const { GIFEncoder } = gifenc;
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sprites = JSON.parse(
  readFileSync(join(here, '..', 'src', 'pet', 'sprites.json'), 'utf8'),
);
const outDir = join(here, '..', 'public', 'themes', 'pixel-gif');
mkdirSync(outDir, { recursive: true });

const SIZE = sprites.size || 16;
const SCALE = 11;

// Palette index 0 is reserved for transparency.
const chars = Object.keys(sprites.palette);
const palette = [[0, 0, 0], ...chars.map((c) => hexToRGB(sprites.palette[c]))];
const charToIndex = new Map(chars.map((c, i) => [c, i + 1]));

function hexToRGB(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function frameToIndexed(rows) {
  const w = SIZE * SCALE;
  const out = new Uint8Array(w * w); // 0 = transparent
  for (let y = 0; y < SIZE; y++) {
    const row = rows[y] || '';
    for (let x = 0; x < SIZE; x++) {
      const idx = charToIndex.get(row[x]);
      if (!idx) continue;
      for (let py = 0; py < SCALE; py++) {
        for (let px = 0; px < SCALE; px++) {
          out[(y * SCALE + py) * w + (x * SCALE + px)] = idx;
        }
      }
    }
  }
  return out;
}

for (const [state, def] of Object.entries(sprites.states)) {
  const gif = GIFEncoder();
  const w = SIZE * SCALE;
  const delay = Math.round(1000 / (def.fps || 4));
  def.frames.forEach((rows, i) => {
    gif.writeFrame(frameToIndexed(rows), w, w, {
      palette,
      first: i === 0,
      transparent: true,
      transparentIndex: 0,
      dispose: 2,
      delay,
      repeat: 0,
    });
  });
  gif.finish();
  const file = join(outDir, `${state}.gif`);
  writeFileSync(file, gif.bytes());
  console.log(`wrote ${file} (${def.frames.length} frames, ${delay}ms)`);
}
