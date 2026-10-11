import { palette, type PaletteName } from '@/design/tokens';

import { GLYPHS } from './glyphs';

/** Straight (unpremultiplied) RGBA, one byte per channel, row-major. */
export interface Bitmap {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

export interface SpriteSource {
  readonly w: number;
  readonly h: number;
  readonly rows: readonly string[];
}

/** Maps a sprite's one-letter color code to another code (coat recolors). */
export type CodeMap = Readonly<Record<string, string>>;

// Coats swap fur (g) and markings (s) for other palette codes. Cat and dog share the codes.
export const COATS = {
  cat: { tabby: {}, grey: { g: 'm', s: 'r' }, cream: { g: 'y', s: 'h' }, tuxedo: { g: 'u', s: 't' } },
  dog: { golden: {}, black: { g: 'u', s: 't' }, cream: { g: 'y', s: 'h' }, spotted: { g: 'c', s: 'o' } },
} as const satisfies Record<string, Record<string, CodeMap>>;

export type PetKind = keyof typeof COATS;

export interface Coat {
  /** Stable cache key, e.g. "cat.grey". */
  readonly key: string;
  readonly recolor: CodeMap;
}

/** Every pet × coat combination, cats first, in COATS order. */
export const ALL_COATS: readonly { readonly kind: PetKind; readonly coat: Coat }[] = (['cat', 'dog'] as const).flatMap(
  (kind) => Object.entries(COATS[kind]).map(([name, recolor]) => ({ kind, coat: { key: `${kind}.${name}`, recolor } })),
);

const TRANSPARENT = '.';

function hexBytes(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export function rasterizeSprite(
  sprite: SpriteSource,
  codes: Readonly<Record<string, string>>,
  recolor: CodeMap = {},
): Bitmap {
  const data = new Uint8Array(sprite.w * sprite.h * 4);
  for (let y = 0; y < sprite.h; y++) {
    const row = sprite.rows[y] ?? '';
    for (let x = 0; x < sprite.w; x++) {
      const raw = row[x] ?? TRANSPARENT;
      if (raw === TRANSPARENT) continue;
      const code = recolor[raw] ?? raw;
      const name = codes[code];
      if (!name || !(name in palette)) throw new Error(`Unknown sprite color code "${code}"`);
      const [r, g, b] = hexBytes(palette[name as PaletteName]);
      const i = (y * sprite.w + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { width: sprite.w, height: sprite.h, data };
}

export const GLYPH_W = 5;
export const GLYPH_H = 7;
const ADVANCE = GLYPH_W + 1;

export function textWidth(text: string): number {
  return text.length ? text.length * ADVANCE - 1 : 0;
}

/** Renders Dusk 5×7 text, one bitmap pixel per font pixel. Lowercase is uppercased. */
export function rasterizeText(text: string, hex: string): Bitmap {
  const str = text.toUpperCase();
  const width = Math.max(1, textWidth(str));
  const data = new Uint8Array(width * GLYPH_H * 4);
  const [r, g, b] = hexBytes(hex);
  for (let i = 0; i < str.length; i++) {
    const glyph = GLYPHS[str.charAt(i)] ?? GLYPHS['?'] ?? [];
    for (let y = 0; y < GLYPH_H; y++) {
      const row = glyph[y] ?? '';
      for (let x = 0; x < GLYPH_W; x++) {
        if (row[x] !== '#') continue;
        const p = (y * width + i * ADVANCE + x) * 4;
        data[p] = r;
        data[p + 1] = g;
        data[p + 2] = b;
        data[p + 3] = 255;
      }
    }
  }
  return { width, height: GLYPH_H, data };
}

/** Greedy word wrap for scene text; lines never exceed maxChars unless a single word does. */
export function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.toUpperCase().split(/\s+/).filter(Boolean)) {
    if (!current) current = word;
    else if (current.length + 1 + word.length <= maxChars) current += ` ${word}`;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
