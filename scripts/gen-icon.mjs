// Generates the app icon and splash image from our own sprites + palette, so the art stays on the locked palette
// and pixel grid with no hand-exported files. Rerun after tweaking: node scripts/gen-icon.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'images');
const { codes, palette, sprites } = JSON.parse(readFileSync(join(ROOT, 'src', 'design', 'sprites.json'), 'utf8'));

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// ---- PNG (RGBA, 8-bit) --------------------------------------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
/** `alpha` false writes RGB: App Store Connect rejects icons with an alpha channel. */
function png(width, height, rgba, alpha) {
  const ch = alpha ? 4 : 3;
  const raw = Buffer.alloc((width * ch + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * ch + 1);
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < ch; c++) raw[row + 1 + x * ch + c] = rgba[(y * width + x) * 4 + c];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = alpha ? 6 : 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- Art grid ------------------------------------------------------------------------------------------------------

/** An art-px canvas of palette colors (null = transparent), upscaled nearest-neighbor on export. */
function grid(w, h) {
  const px = Array.from({ length: w * h }, () => null);
  return {
    w,
    h,
    set: (x, y, c) => {
      if (x >= 0 && y >= 0 && x < w && y < h) px[y * w + x] = c;
    },
    get: (x, y) => px[y * w + x],
  };
}

function stamp(g, name, ox, oy) {
  const { rows } = sprites[name];
  rows.forEach((row, y) => {
    [...row].forEach((code, x) => {
      if (code !== '.') g.set(ox + x, oy + y, palette[codes[code]]);
    });
  });
}

// JS port of SWIRL_SKSL (src/render/sksl.ts) at a fixed phase, darkened by `dim` like the after-sequence swirl.
function swirl(g, t, dim) {
  const bands = ['dusk', 'twilight', 'plum', 'heather', 'teal'].map((k) => rgb(palette[k]));
  const bayer2 = (x, y) => {
    x = Math.floor(x);
    y = Math.floor(y);
    const v = x * 0.5 + y * y * 0.75;
    return v - Math.floor(v);
  };
  const bayer4 = (x, y) => bayer2(0.5 * x, 0.5 * y) * 0.25 + bayer2(x, y);
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const ay = g.h - 1 - y;
      const u = (x + 0.5 - g.w / 2) / g.h;
      const v0 = (ay + 0.5 - g.h / 2) / g.h + 0.12;
      const r = Math.hypot(u, v0);
      const a = Math.atan2(v0, u) + r * 3.4 - t * 0.32;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      let v = Math.sin(px * 7 + t * 0.55) * 0.5;
      v += Math.sin(py * 9 - t * 0.35 + Math.sin(px * 3 + t * 0.2) * 2) * 0.5;
      v += Math.sin(r * 11 - t * 0.7) * 0.35;
      v = Math.min(0.999, Math.max(0, v * 0.37 + 0.5 + (bayer4(x, ay) - 0.5) * 0.24));
      const band = v < 0.3 ? 0 : v < 0.56 ? 1 : v < 0.8 ? 2 : v < 0.955 ? 3 : 4;
      const c = bands[band].map((ch, i) => Math.round(ch + (bands[0][i] * 0.6 - ch) * dim));
      g.set(x, y, `#${c.map((n) => n.toString(16).padStart(2, '0')).join('')}`);
    }
  }
}

function render(g, unit) {
  const w = g.w * unit;
  const h = g.h * unit;
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = g.get(Math.floor(x / unit), Math.floor(y / unit));
      if (!c) continue;
      rgba.set([...rgb(c), 255], (y * w + x) * 4);
    }
  }
  return { w, h, rgba };
}

// ---- Outputs -------------------------------------------------------------------------------------------------------

// Icon: 64×64 art px at 16 px each = 1024. The sleeping pet under the moon, on the swirl, kept inside the
// centre ~80% so the iOS squircle mask never clips the art.
const icon = grid(64, 64);
swirl(icon, 6, 0.2);
stamp(icon, 'moon', 40, 10);
stamp(icon, 'cat_sleep', 16, 20);

// Splash: the pet alone on transparent, cropped to its 30×21 art px so it centres, at 12 px per art px (360×252),
// shown at 120pt wide (@3x) so iOS never resamples the pixels. Background colour comes from app.json
// (night = the boot screen's surface-deep).
const splash = grid(30, 21);
stamp(splash, 'cat_sleep', -2, -11);

mkdirSync(OUT, { recursive: true });
for (const [file, g, unit, alpha] of [
  ['icon.png', icon, 16, false],
  ['splash-icon.png', splash, 12, true],
]) {
  const { w, h, rgba } = render(g, unit);
  writeFileSync(join(OUT, file), png(w, h, rgba, alpha));
  console.log(`${file} ${w}×${h}`);
}
