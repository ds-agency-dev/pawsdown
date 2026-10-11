import { clockLabel, nudgeBody, nudgeTimes } from '../nudge';

jest.mock('expo-notifications', () => ({}));

describe('nudgeTimes', () => {
  it('fires 15 minutes before the end on each workday, Sunday = 1', () => {
    expect(nudgeTimes(17 * 60 + 30, 0b0000010)).toEqual([{ weekday: 2, hour: 17, minute: 15 }]);
    expect(nudgeTimes(9 * 60, 0b1000001).map((t) => t.weekday)).toEqual([1, 7]);
  });

  it('moves to the day before when the end is just after midnight', () => {
    // A Monday ending at midnight nudges Sunday 23:45; a Sunday one nudges Saturday.
    expect(nudgeTimes(0, 0b0000010)).toEqual([{ weekday: 1, hour: 23, minute: 45 }]);
    expect(nudgeTimes(0, 0b0000001)).toEqual([{ weekday: 7, hour: 23, minute: 45 }]);
  });
});

describe('copy', () => {
  it('formats a 12-hour clock', () => {
    expect(clockLabel(0)).toBe('12:00 AM');
    expect(clockLabel(12 * 60 + 15)).toBe('12:15 PM');
    expect(clockLabel(17 * 60 + 30)).toBe('5:30 PM');
    expect(nudgeBody('Biscuit', 17 * 60 + 30)).toBe('Biscuit is waiting by the drawer. Clock out at 5:30.');
  });
});
