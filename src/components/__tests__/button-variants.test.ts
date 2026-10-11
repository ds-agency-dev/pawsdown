import { menu } from '@/design/tokens';

import { BUTTON_VARIANTS } from '../button-variants';

describe('BUTTON_VARIANTS', () => {
  it('only disabled sits flat, so every live button has an underside to drop onto', () => {
    for (const [variant, style] of Object.entries(BUTTON_VARIANTS)) {
      expect(style.underside === null).toBe(variant === 'disabled');
    }
  });

  it('never sets ember or heather as text (palette rule)', () => {
    for (const style of Object.values(BUTTON_VARIANTS)) {
      expect(['ember', 'heather']).not.toContain(style.ink);
    }
  });
});

describe('menu metrics', () => {
  it('keeps art px and font px whole points so pixels stay crisp', () => {
    expect(Number.isInteger(menu.artPt)).toBe(true);
    expect(Number.isInteger(menu.float.liftPt)).toBe(true);
    for (const px of Object.values(menu.textPx)) expect(Number.isInteger(px)).toBe(true);
  });

  it('glows for 12% of a 2.4 s pulse', () => {
    expect(menu.pulse.restMs + menu.pulse.glowMs).toBe(2400);
    expect(menu.pulse.glowMs / 2400).toBeCloseTo(0.12);
  });
});
