import { rasterizeSprite } from '@/render/bitmap';

import { ICONS } from '../icons';
import sprites from '../sprites.json';

describe('ICONS', () => {
  it.each(Object.entries(ICONS))('%s is a rectangle of known color codes', (_name, rows) => {
    const w = rows[0].length;
    expect(rows.every((row) => row.length === w)).toBe(true);
    expect(() => rasterizeSprite({ w, h: rows.length, rows }, sprites.codes)).not.toThrow();
  });
});
