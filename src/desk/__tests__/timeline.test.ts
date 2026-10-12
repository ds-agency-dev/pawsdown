import { motion } from '@/design/tokens';

import {
  BEAT,
  cardFrame,
  CLEAR_OUT,
  drawerOpen,
  HOLD,
  IDLE,
  lidOpen,
  LIGHTS_OUT,
  lightsOutFx,
  petFrame,
  REWARD,
  rewardFrame,
  SEQ_TOTAL,
  SKIP_TO,
  springAt,
  swirlDim,
  tallyFrame,
  tallyRow,
  ticketFrame,
} from '../timeline';

const beat = (id: string) => {
  const t = BEAT[id];
  if (t === undefined) throw new Error(`No beat ${id}`);
  return t;
};

describe('springAt', () => {
  it('starts at 0, overshoots when underdamped, and settles at 1', () => {
    expect(springAt(0, motion.springs.snap)).toBe(0);
    const samples = Array.from({ length: 60 }, (_, i) => springAt(i * 10, motion.springs.snap));
    expect(Math.max(...samples)).toBeGreaterThan(1);
    expect(springAt(3000, motion.springs.snap)).toBeCloseTo(1, 3);
  });
});

describe('shutdown timeline', () => {
  it('orders the beats into two acts around the hold', () => {
    const order = ['drawer-shut', 'win-stamp', 'tally', 'hold', 'lights-out', 'hop', 'clear-out', 'reward', 'rest'];
    const times = order.map(beat);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(SEQ_TOTAL).toBe(beat('rest'));
  });

  it('finishes act one before the hold: tally counted, nothing of act two started', () => {
    expect(tallyRow(2, HOLD, 4, 5).value).toBe(5);
    expect(tallyFrame(HOLD).alpha).toBe(1);
    expect(ticketFrame(HOLD, false).alpha).toBe(1);
    expect(lidOpen(HOLD, false)).toBe(1);
    expect(petFrame(HOLD, 0, false, false).pose).not.toBe('sleep');
    expect(lightsOutFx(HOLD, false, 0.03).bright).toBe(1);
  });

  it('opens the drawer, then shuts it on the drawer-shut beat', () => {
    expect(drawerOpen(IDLE)).toBe(0);
    expect(drawerOpen(beat('drawer-shut') - 50)).toBeGreaterThan(0.9);
    expect(drawerOpen(beat('drawer-shut') + 800)).toBeCloseTo(0, 2);
  });

  it('files every card by the time the drawer has shut', () => {
    for (const i of [0, 1, 2]) {
      expect(cardFrame(i, IDLE, 0, false).visible).toBe(true);
      expect(cardFrame(i, beat('drawer-shut') + 10, 0, false).visible).toBe(false);
    }
  });

  it('flips cards to their backs mid-flight, but only fades them under Reduce Motion', () => {
    const mid = beat('card-1') + 100;
    expect(cardFrame(0, mid, 0, false).sx).toBeLessThan(0);
    const reduced = cardFrame(0, mid, 0, true);
    expect(reduced.sx).toBe(1);
    expect(reduced.alpha).toBeLessThan(1);
  });

  it('sends the pet to sleep and shuts the lid after lights out', () => {
    expect(petFrame(IDLE, 0, false, true).pose).toBe('sleep');
    expect(petFrame(SEQ_TOTAL, 0, false, false).pose).toBe('sleep');
    expect(petFrame(SEQ_TOTAL, 0, true, false).pose).toBe('sleep');
    expect(lidOpen(IDLE, false)).toBe(1);
    expect(lidOpen(LIGHTS_OUT + 500, false)).toBe(0);
  });

  it('stamps the win on its beat and clears the stats for the panel', () => {
    expect(ticketFrame(beat('win-stamp') - 1, false).stamped).toBe(false);
    expect(ticketFrame(beat('win-stamp') + 1, false).stamped).toBe(true);
    expect(tallyRow(2, beat('tally') + 10, 4, 5).value).toBe(4);
    expect(tallyFrame(CLEAR_OUT + 300).visible).toBe(false);
    expect(ticketFrame(CLEAR_OUT + 300, false).visible).toBe(false);
  });

  it('shakes and pulses only under full motion', () => {
    const t = LIGHTS_OUT + 40;
    expect(lightsOutFx(t, false, 0.03).bright).toBeGreaterThan(1);
    expect(lightsOutFx(t, true, 0.03)).toEqual({ shakeX: 0, shakeY: 0, bright: 1 });
  });

  it('lands on the rested final frame when skipped', () => {
    expect(rewardFrame(REWARD - 1, false).visible).toBe(false);
    expect(rewardFrame(SKIP_TO, false).y).toBeCloseTo(126, 0);
    expect(swirlDim(SKIP_TO)).toBeCloseTo(0.35);
  });
});
