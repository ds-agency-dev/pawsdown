import { limits } from '@/data/migrations';
import { SWITCH_OFF } from '@/data/profile';

import { boundaryMoves, WIN_STARTERS } from '../copy';

describe('boundaryMoves', () => {
  it('offers the onboarding picks first, then the classic, three at most', () => {
    const moves = boundaryMoves(['email', 'meetings', 'weekend']);
    expect(moves.map((m) => m.why)).toEqual(['For: Email', 'For: Replaying meetings', 'A classic']);
  });

  it("doesn't repeat the classic when the laptop was picked", () => {
    const moves = boundaryMoves(['laptop', 'chat', 'tasks']);
    expect(moves).toHaveLength(3);
    expect(new Set(moves.map((m) => m.text)).size).toBe(3);
  });

  it('falls back to the mockup set when nothing was picked', () => {
    expect(boundaryMoves([]).map((m) => m.why)).toEqual(['For: Slack and chat', 'For: Unfinished tasks', 'A classic']);
  });

  it('fits every move and starter in the saved limits', () => {
    for (const m of boundaryMoves(SWITCH_OFF)) expect(m.text.length).toBeLessThanOrEqual(limits.boundaryChars);
    for (const topic of SWITCH_OFF) {
      for (const m of boundaryMoves([topic])) expect(m.text.length).toBeLessThanOrEqual(limits.boundaryChars);
    }
    for (const s of WIN_STARTERS) expect(s.length).toBeLessThanOrEqual(limits.winChars);
  });
});
