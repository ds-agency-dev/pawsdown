import { limits } from './migrations';
import type { ProfileDb } from './profile';

export interface Draft {
  /** Local calendar day (YYYY-MM-DD) the win and boundary belong to. */
  day: string;
  /** Tomorrow's top 3 by slot; '' = empty. */
  cards: readonly [string, string, string];
  win: string;
  boundary: string;
  boundaryDone: boolean;
}

export interface Evening {
  cards: string[];
  win: string | null;
  boundary: string | null;
  boundaryDone: boolean;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const two = (n: number) => String(n).padStart(2, '0');

export function localDay(date: Date): string {
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

export function emptyDraft(day: string): Draft {
  return { day, cards: ['', '', ''], win: '', boundary: '', boundaryDone: false };
}

function text(r: Record<string, unknown>, key: string, max: number): string {
  const value = r[key];
  if (typeof value !== 'string' || value.length > max) throw new Error(`draft.${key} is invalid`);
  return value;
}

export function parseDraft(row: unknown): Draft {
  if (typeof row !== 'object' || row === null) throw new Error('draft row missing');
  const r = row as Record<string, unknown>;
  if (typeof r.day !== 'string' || !DAY.test(r.day)) throw new Error(`draft.day is invalid: ${String(r.day)}`);
  if (r.boundary_done !== 0 && r.boundary_done !== 1)
    throw new Error(`draft.boundary_done is not 0/1: ${String(r.boundary_done)}`);
  return {
    day: r.day,
    cards: [text(r, 'card0', limits.cardChars), text(r, 'card1', limits.cardChars), text(r, 'card2', limits.cardChars)],
    win: text(r, 'win', limits.winChars),
    boundary: text(r, 'boundary', limits.boundaryChars),
    boundaryDone: r.boundary_done === 1,
  };
}

/** Cards carry over to a new day (never lose typed plans); win and boundary are today's only. */
export function draftForDay(draft: Draft, day: string): Draft {
  return draft.day === day ? draft : { ...emptyDraft(day), cards: draft.cards };
}

/** Trimmed, non-empty cards in slot order; null win/boundary when blank. Null overall when there's no card. */
export function eveningFromDraft(draft: Draft): Evening | null {
  const cards = draft.cards.map((card) => card.trim()).filter((card) => card !== '');
  if (cards.length === 0) return null;
  const win = draft.win.trim() || null;
  const boundary = draft.boundary.trim() || null;
  return { cards, win, boundary, boundaryDone: boundary !== null && draft.boundaryDone };
}

function check(value: string, max: number, what: string) {
  if (value.length > max) throw new Error(`${what} is longer than ${max} characters`);
}

export async function loadDraft(db: ProfileDb, day: string): Promise<Draft> {
  const row = await db.getFirstAsync('SELECT * FROM draft WHERE id = 1');
  return row === null ? emptyDraft(day) : draftForDay(parseDraft(row), day);
}

export async function saveDraft(db: ProfileDb, draft: Draft) {
  const cards = draft.cards.map((card) => card.trim());
  const win = draft.win.trim();
  const boundary = draft.boundary.trim();
  cards.forEach((card, i) => check(card, limits.cardChars, `Card ${i + 1}`));
  check(win, limits.winChars, 'Win');
  check(boundary, limits.boundaryChars, 'Boundary');
  await db.runAsync(
    'INSERT OR REPLACE INTO draft (id, day, card0, card1, card2, win, boundary, boundary_done) VALUES (1, ?, ?, ?, ?, ?, ?, ?)',
    [draft.day, ...cards, win, boundary, Number(draft.boundaryDone)],
  );
}

export async function countEvenings(db: ProfileDb): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT count(*) AS n FROM evenings');
  if (row === null || !Number.isInteger(row.n)) throw new Error('Evening count missing');
  return row.n;
}

/** Saves the evening and its cards and drops the draft in one transaction. Returns the evenings total. */
export async function clockOut(db: ProfileDb, draft: Draft, now: number): Promise<number> {
  const evening = eveningFromDraft(draft);
  if (evening === null) throw new Error('Clock out needs at least one card');
  if (!DAY.test(draft.day)) throw new Error(`Invalid day ${draft.day}`);
  evening.cards.forEach((card, i) => check(card, limits.cardChars, `Card ${i + 1}`));
  if (evening.win !== null) check(evening.win, limits.winChars, 'Win');
  if (evening.boundary !== null) check(evening.boundary, limits.boundaryChars, 'Boundary');
  await db.execAsync('BEGIN');
  try {
    await db.runAsync(
      // The shared param type has no null, so blanks go in as '' and NULLIF turns them back into NULL.
      `INSERT INTO evenings (day, win, boundary, boundary_done, clocked_out_at)
       VALUES (?, NULLIF(?, ''), NULLIF(?, ''), ?, ?)
       ON CONFLICT(day) DO UPDATE SET win = excluded.win, boundary = excluded.boundary,
         boundary_done = excluded.boundary_done, clocked_out_at = excluded.clocked_out_at`,
      [draft.day, evening.win ?? '', evening.boundary ?? '', Number(evening.boundaryDone), now],
    );
    await db.runAsync('DELETE FROM cards WHERE evening_id = (SELECT id FROM evenings WHERE day = ?)', [draft.day]);
    for (const [position, card] of evening.cards.entries()) {
      await db.runAsync(
        'INSERT INTO cards (evening_id, position, text) VALUES ((SELECT id FROM evenings WHERE day = ?), ?, ?)',
        [draft.day, position, card],
      );
    }
    await db.execAsync('DELETE FROM draft');
    const total = await countEvenings(db);
    await db.execAsync('COMMIT');
    return total;
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}
