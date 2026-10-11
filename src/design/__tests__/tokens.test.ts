import { hexToRgb01, palette, sequence } from '../tokens';

describe('tokens', () => {
  it('locks the palette to 16 valid hex colors', () => {
    const hexes = Object.values(palette);
    expect(hexes).toHaveLength(16);
    for (const hex of hexes) expect(hex).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('converts hex to 0..1 RGB', () => {
    expect(hexToRgb01('#FF0080')).toEqual([1, 0, 128 / 255]);
    expect(() => hexToRgb01('red')).toThrow();
  });

  it('keeps sequence beats ordered and inside the total', () => {
    const times = sequence.beats.map((b) => b.t);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(Math.max(...times)).toBeLessThanOrEqual(sequence.totalMs);
  });
});
