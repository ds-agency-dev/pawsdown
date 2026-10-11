import { setSoundEnabled } from '@/audio/sounds';
import { setHapticsEnabled } from '@/motion/haptics';

import { limits, migrate, MIGRATIONS } from '../migrations';
import { getSettings, parseSettings, updateSettings } from '../settings';
import { changeSettings, loadSettings } from '../settings-store';

jest.mock('@/audio/sounds', () => ({ setSoundEnabled: jest.fn() }));
jest.mock('@/motion/haptics', () => ({ setHapticsEnabled: jest.fn() }));

// Node's built-in SQLite stands in for expo-sqlite; only the methods the data layer uses are adapted.
interface NodeStatement {
  get(...params: unknown[]): unknown;
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
    runAsync: async (sql: string, params: (string | number)[]) => raw.prepare(sql).run(...params),
  };
}

const version = (db: ReturnType<typeof openTestDb>) =>
  (db.raw.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;

describe('migrate', () => {
  it('brings a fresh database to the latest version and is idempotent', async () => {
    const db = openTestDb();
    await migrate(db);
    expect(version(db)).toBe(MIGRATIONS.length);
    await migrate(db);
    expect(version(db)).toBe(MIGRATIONS.length);
  });

  it('rolls back a failing step and keeps the last good version', async () => {
    const db = openTestDb();
    const steps = ['CREATE TABLE a (x INTEGER)', 'CREATE TABLE b (x INTEGER); CREATE TABLE a (x INTEGER)'];
    await expect(migrate(db, steps)).rejects.toThrow();
    expect(version(db)).toBe(1);
    expect(db.raw.prepare("SELECT name FROM sqlite_master WHERE name = 'b'").get()).toBeUndefined();
  });

  it('refuses a database from a newer app', async () => {
    const db = openTestDb();
    db.raw.exec(`PRAGMA user_version = ${MIGRATIONS.length + 1}`);
    await expect(migrate(db)).rejects.toThrow(/newer/);
  });
});

describe('schema', () => {
  async function migrated() {
    const db = openTestDb();
    await migrate(db);
    db.raw.exec("INSERT INTO evenings (id, day, clocked_out_at) VALUES (1, '2026-10-11', 0)");
    return db;
  }

  it('enforces the card and win limits', async () => {
    const db = await migrated();
    const card = db.raw.prepare('INSERT INTO cards (evening_id, position, text) VALUES (1, ?, ?)');
    expect(() => card.run(0, 'x'.repeat(limits.cardChars))).not.toThrow();
    expect(() => card.run(1, 'x'.repeat(limits.cardChars + 1))).toThrow();
    expect(() => card.run(3, 'four')).toThrow();
    expect(() => card.run(0, 'same slot')).toThrow();
    const win = db.raw.prepare('UPDATE evenings SET win = ? WHERE id = 1');
    expect(() => win.run('x'.repeat(limits.winChars + 1))).toThrow();
  });

  it('keeps one evening per day and deletes its cards with it', async () => {
    const db = await migrated();
    expect(() => db.raw.exec("INSERT INTO evenings (day, clocked_out_at) VALUES ('2026-10-11', 1)")).toThrow();
    db.raw.exec("INSERT INTO cards (evening_id, position, text) VALUES (1, 0, 'ship it')");
    db.raw.exec('DELETE FROM evenings');
    expect(db.raw.prepare('SELECT count(*) AS n FROM cards').get()).toEqual({ n: 0 });
  });
});

describe('settings', () => {
  it('starts with defaults and round-trips updates', async () => {
    const db = openTestDb();
    await migrate(db);
    expect(await getSettings(db)).toEqual({
      easyRead: false,
      screenEffect: 'full',
      haptics: true,
      sound: true,
      analytics: true,
    });
    await updateSettings(db, { sound: false, screenEffect: 'soft' });
    expect(await getSettings(db)).toMatchObject({ sound: false, screenEffect: 'soft', haptics: true });
  });

  it('rejects malformed rows', () => {
    const ok = { easy_read: 0, screen_effect: 'off', haptics: 1, sound: 1, analytics: 0 };
    expect(parseSettings(ok).screenEffect).toBe('off');
    expect(() => parseSettings({ ...ok, screen_effect: 'warp' })).toThrow();
    expect(() => parseSettings({ ...ok, sound: 2 })).toThrow();
    expect(() => parseSettings(null)).toThrow();
  });
});

describe('settings store', () => {
  it('feeds sound and haptics, and keeps the store in step with the database when a save fails', async () => {
    const db = openTestDb();
    await migrate(db);
    await loadSettings(db);
    expect(setSoundEnabled).toHaveBeenLastCalledWith(true);

    await changeSettings(db, { sound: false, haptics: false });
    expect(setSoundEnabled).toHaveBeenLastCalledWith(false);
    expect(setHapticsEnabled).toHaveBeenLastCalledWith(false);
    expect(await getSettings(db)).toMatchObject({ sound: false, haptics: false });

    const failing = { ...db, runAsync: () => Promise.reject(new Error('disk full')) };
    await expect(changeSettings(failing, { sound: true })).rejects.toThrow('disk full');
    expect(setSoundEnabled).toHaveBeenLastCalledWith(false);
  });
});
