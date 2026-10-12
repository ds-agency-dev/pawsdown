import {
  clockOut,
  countEvenings,
  draftForDay,
  emptyDraft,
  eveningFromDraft,
  loadDraft,
  localDay,
  parseDraft,
  saveDraft,
} from '../evening';
import { limits, migrate, MIGRATIONS } from '../migrations';

interface NodeStatement {
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  run(...params: unknown[]): unknown;
}
interface NodeDatabase {
  exec(sql: string): void;
  prepare(sql: string): NodeStatement;
}
const { DatabaseSync } = jest.requireActual<{ DatabaseSync: new (path: string) => NodeDatabase }>('node:sqlite');

function openTestDb() {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  return {
    raw,
    execAsync: async (sql: string) => raw.exec(sql),
    getFirstAsync: async <T>(sql: string) => (raw.prepare(sql).get() as T | undefined) ?? null,
    getAllAsync: async <T>(sql: string) => raw.prepare(sql).all() as T[],
    runAsync: async (sql: string, params: (string | number)[]) => raw.prepare(sql).run(...params),
  };
}

const DAY = '2026-10-11';
const draft = {
  ...emptyDraft(DAY),
  cards: ['  ship it ', '', 'call mum'] as const,
  win: ' fixed it ',
  boundary: 'no email',
};

describe('migration v4', () => {
  it('applies on a v3 database, keeping existing evenings', async () => {
    const db = openTestDb();
    await migrate(db, MIGRATIONS.slice(0, 3));
    db.raw.exec(`INSERT INTO evenings (day, clocked_out_at) VALUES ('${DAY}', 0)`);
    await migrate(db);
    expect(db.raw.prepare('SELECT boundary_done FROM evenings').get()).toEqual({ boundary_done: 0 });
    expect(() => db.raw.exec("INSERT INTO draft (id, day, win) VALUES (1, '2026-10-11', 'ok')")).not.toThrow();
    const long = 'x'.repeat(limits.cardChars + 1);
    expect(() => db.raw.exec(`UPDATE draft SET card0 = '${long}'`)).toThrow();
  });
});

describe('draft helpers', () => {
  const row = { day: DAY, card0: 'a', card1: '', card2: 'c', win: 'w', boundary: 'b', boundary_done: 1 };

  it('formats local days', () => {
    expect(localDay(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('parses a good row and rejects bad ones', () => {
    expect(parseDraft(row)).toEqual({ day: DAY, cards: ['a', '', 'c'], win: 'w', boundary: 'b', boundaryDone: true });
    expect(() => parseDraft(null)).toThrow();
    expect(() => parseDraft({ ...row, day: 'today' })).toThrow();
    expect(() => parseDraft({ ...row, card1: 5 })).toThrow();
    expect(() => parseDraft({ ...row, win: 'x'.repeat(limits.winChars + 1) })).toThrow();
    expect(() => parseDraft({ ...row, boundary_done: 2 })).toThrow();
  });

  it('keeps cards but clears the win and boundary on a new day', () => {
    const next = draftForDay({ ...draft, boundaryDone: true }, '2026-10-12');
    expect(next).toEqual({ ...emptyDraft('2026-10-12'), cards: draft.cards });
    expect(draftForDay(draft, DAY)).toBe(draft);
  });

  it('builds an evening only from a draft with a card', () => {
    expect(eveningFromDraft(emptyDraft(DAY))).toBeNull();
    expect(eveningFromDraft({ ...emptyDraft(DAY), cards: ['  ', ' ', ''] })).toBeNull();
    expect(eveningFromDraft(draft)).toEqual({
      cards: ['ship it', 'call mum'],
      win: 'fixed it',
      boundary: 'no email',
      boundaryDone: false,
    });
    expect(eveningFromDraft({ ...emptyDraft(DAY), cards: ['a', '', ''] })).toMatchObject({ win: null, boundary: null });
  });
});

describe('draft and clock-out', () => {
  async function migrated() {
    const db = openTestDb();
    await migrate(db);
    return db;
  }

  it('round-trips a draft and carries cards to a new day', async () => {
    const db = await migrated();
    expect(await loadDraft(db, DAY)).toEqual(emptyDraft(DAY));
    await saveDraft(db, draft);
    expect(await loadDraft(db, DAY)).toMatchObject({ cards: ['ship it', '', 'call mum'], win: 'fixed it' });
    expect(await loadDraft(db, '2026-10-12')).toEqual({
      ...emptyDraft('2026-10-12'),
      cards: ['ship it', '', 'call mum'],
    });
    await expect(saveDraft(db, { ...draft, boundary: 'x'.repeat(limits.boundaryChars + 1) })).rejects.toThrow();
  });

  it('saves the evening and cards, clears the draft, and updates on a second clock-out', async () => {
    const db = await migrated();
    await saveDraft(db, draft);
    expect(await clockOut(db, draft, 100)).toBe(1);
    expect(db.raw.prepare('SELECT day, win, boundary, boundary_done, clocked_out_at FROM evenings').all()).toEqual([
      { day: DAY, win: 'fixed it', boundary: 'no email', boundary_done: 0, clocked_out_at: 100 },
    ]);
    expect(db.raw.prepare('SELECT position, text FROM cards ORDER BY position').all()).toEqual([
      { position: 0, text: 'ship it' },
      { position: 1, text: 'call mum' },
    ]);
    expect(db.raw.prepare('SELECT count(*) AS n FROM draft').get()).toEqual({ n: 0 });

    const again = {
      ...emptyDraft(DAY),
      cards: ['only one', '', ''] as const,
      boundaryDone: true,
      boundary: 'laptop shut',
    };
    expect(await clockOut(db, again, 200)).toBe(1);
    expect(db.raw.prepare('SELECT win, boundary, boundary_done, clocked_out_at FROM evenings').all()).toEqual([
      { win: null, boundary: 'laptop shut', boundary_done: 1, clocked_out_at: 200 },
    ]);
    expect(db.raw.prepare('SELECT text FROM cards').all()).toEqual([{ text: 'only one' }]);
  });

  it('refuses an empty or overlong draft and counts evenings', async () => {
    const db = await migrated();
    await expect(clockOut(db, emptyDraft(DAY), 1)).rejects.toThrow(/card/);
    await expect(clockOut(db, { ...draft, win: 'x'.repeat(limits.winChars + 1) }, 1)).rejects.toThrow(/Win/);
    expect(await countEvenings(db)).toBe(0);
    await clockOut(db, draft, 1);
    await clockOut(db, { ...draft, day: '2026-10-12' }, 2);
    expect(await countEvenings(db)).toBe(2);
  });
});
