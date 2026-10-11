import { computeArtGrid } from '../art-grid';

describe('computeArtGrid', () => {
  it('fits a 390×844 @3x iPhone with an integer device-pixel unit', () => {
    const g = computeArtGrid(390, 844, 3);
    expect(g.unitPx).toBe(8);
    expect(g.unitPt).toBeCloseTo(8 / 3);
    expect(g.cols * g.unitPx).toBeGreaterThanOrEqual(1170);
    expect(g.rows * g.unitPx).toBeGreaterThanOrEqual(2532);
    expect(g.originX).toBeGreaterThanOrEqual(0);
    expect(g.originY).toBeGreaterThanOrEqual(0);
  });

  it('fits a 375×667 @2x iPhone SE', () => {
    const g = computeArtGrid(375, 667, 2);
    expect(g.unitPx).toBe(5);
    expect(g.rows).toBeGreaterThanOrEqual(240);
  });

  it('never drops below one device pixel per art pixel', () => {
    expect(computeArtGrid(50, 50, 1).unitPx).toBe(1);
  });
});
