import { palette } from '@/design/tokens';
import sprites from '@/design/sprites.json';

import { COATS, rasterizeSprite, rasterizeText, textWidth, wrapText } from '../bitmap';
import { GLYPHS } from '../glyphs';

function pixel(bitmap: { width: number; data: Uint8Array }, x: number, y: number): number[] {
  const i = (y * bitmap.width + x) * 4;
  return Array.from(bitmap.data.slice(i, i + 4));
}

function rgba(hex: string): number[] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, 255];
}

describe('rasterizeSprite', () => {
  const tiny = { w: 2, h: 2, rows: ['g.', 'os'] };

  it('maps codes to palette colors and leaves "." transparent', () => {
    const b = rasterizeSprite(tiny, sprites.codes);
    expect(pixel(b, 0, 0)).toEqual(rgba(palette.lamp));
    expect(pixel(b, 1, 0)).toEqual([0, 0, 0, 0]);
    expect(pixel(b, 0, 1)).toEqual(rgba(palette.night));
  });

  it('recolors fur and markings for a coat', () => {
    const b = rasterizeSprite(tiny, sprites.codes, COATS.cat.grey);
    expect(pixel(b, 0, 0)).toEqual(rgba(palette.smoke));
    expect(pixel(b, 1, 1)).toEqual(rgba(palette.heather));
  });

  it('rasterizes every shipped sprite in every coat', () => {
    for (const [name, sprite] of Object.entries(sprites.sprites)) {
      const kind = name.startsWith('dog') ? 'dog' : 'cat';
      for (const coat of Object.values(COATS[kind])) {
        expect(() => rasterizeSprite(sprite, sprites.codes, coat)).not.toThrow();
      }
    }
  });

  it('rejects unknown codes', () => {
    expect(() => rasterizeSprite({ w: 1, h: 1, rows: ['Z'] }, sprites.codes)).toThrow(/Z/);
  });
});

describe('Dusk 5×7 text', () => {
  it('has 7 rows of 5 for every glyph', () => {
    for (const rows of Object.values(GLYPHS)) {
      expect(rows).toHaveLength(7);
      for (const row of rows) expect(row).toMatch(/^[.#]{5}$/);
    }
  });

  it('advances 6 px per character with no trailing gap', () => {
    expect(textWidth('AB')).toBe(11);
    expect(rasterizeText('ab', palette.paper).width).toBe(11);
  });

  it('draws the top-left of "A" empty and its crossbar inked', () => {
    const b = rasterizeText('A', palette.paper);
    expect(pixel(b, 0, 0)[3]).toBe(0);
    expect(pixel(b, 0, 3)).toEqual(rgba(palette.paper));
  });

  it('wraps on words', () => {
    expect(wrapText('see you tomorrow', 8)).toEqual(['SEE YOU', 'TOMORROW']);
  });
});
