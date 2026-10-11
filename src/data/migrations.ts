/** The slice of expo-sqlite's database that migrations need; tests drive it with Node's SQLite. */
export interface MigrationDb {
  getFirstAsync<T>(source: string): Promise<T | null>;
  execAsync(source: string): Promise<void>;
}

/** Text limits the UI enforces; the schema repeats them so bad data can never land. */
export const limits = { cardChars: 40, winChars: 60, petNameChars: 12 } as const;

/**
 * Append-only: a shipped migration is never edited, only followed by a new one. Entry `i` takes the database from
 * version `i` to `i + 1` (`PRAGMA user_version`).
 *
 * Rewards, panels and episodes aren't stored: they derive from the count of evenings, so nothing can drift out of
 * step with it.
 */
export const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    easy_read INTEGER NOT NULL DEFAULT 0 CHECK (easy_read IN (0, 1)),
    screen_effect TEXT NOT NULL DEFAULT 'full' CHECK (screen_effect IN ('full', 'soft', 'off')),
    haptics INTEGER NOT NULL DEFAULT 1 CHECK (haptics IN (0, 1)),
    sound INTEGER NOT NULL DEFAULT 1 CHECK (sound IN (0, 1)),
    analytics INTEGER NOT NULL DEFAULT 1 CHECK (analytics IN (0, 1))
  );
  INSERT INTO settings (id) VALUES (1);

  CREATE TABLE pet (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    species TEXT NOT NULL CHECK (species IN ('cat', 'dog')),
    name TEXT NOT NULL CHECK (length(name) >= 1),
    coat TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  -- One row per clock-out. day is the user's local calendar day (YYYY-MM-DD), so time zones never split or merge
  -- evenings; win and boundary stay optional until the flow is final.
  CREATE TABLE evenings (
    id INTEGER PRIMARY KEY,
    day TEXT NOT NULL UNIQUE CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    win TEXT CHECK (win IS NULL OR length(win) BETWEEN 1 AND ${limits.winChars}),
    boundary TEXT,
    clocked_out_at INTEGER NOT NULL
  );

  -- Tomorrow's top 3, planned during an evening's clock-out.
  CREATE TABLE cards (
    id INTEGER PRIMARY KEY,
    evening_id INTEGER NOT NULL REFERENCES evenings (id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position BETWEEN 0 AND 2),
    text TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND ${limits.cardChars}),
    UNIQUE (evening_id, position)
  );
  `,
  `
  -- Nothing wrote pet before onboarding, so rebuilding it to cap the name loses no data.
  DROP TABLE pet;
  CREATE TABLE pet (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    species TEXT NOT NULL CHECK (species IN ('cat', 'dog')),
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND ${limits.petNameChars}),
    coat TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  -- end_minute is minutes after local midnight in 15-minute steps; days is a bitmask, bit 0 = Sunday (Date#getDay).
  CREATE TABLE workday (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    end_minute INTEGER NOT NULL DEFAULT 1050 CHECK (end_minute BETWEEN 0 AND 1425 AND end_minute % 15 = 0),
    days INTEGER NOT NULL DEFAULT 62 CHECK (days BETWEEN 1 AND 127),
    nudge INTEGER NOT NULL DEFAULT 0 CHECK (nudge IN (0, 1))
  );
  INSERT INTO workday (id) VALUES (1);

  -- What's hardest to switch off; shapes the boundary-move suggestions.
  CREATE TABLE switch_off (
    topic TEXT PRIMARY KEY CHECK (topic IN ('chat', 'email', 'tasks', 'meetings', 'laptop', 'weekend'))
  );
  `,
];

/**
 * Brings the database up to the latest schema. Each step commits together with its version bump, so a failure
 * leaves the database at the last good version rather than half-migrated.
 */
export async function migrate(db: MigrationDb, migrations: readonly string[] = MIGRATIONS) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const from = row?.user_version ?? 0;
  if (from > migrations.length) {
    // A newer app wrote this database (e.g. a restored backup); guessing at its schema could corrupt it.
    throw new Error(`Database version ${from} is newer than this app (${migrations.length})`);
  }
  for (let v = from; v < migrations.length; v++) {
    await db.execAsync('BEGIN');
    try {
      await db.execAsync(`${migrations[v]};\nPRAGMA user_version = ${v + 1};`);
      await db.execAsync('COMMIT');
    } catch (error) {
      await db.execAsync('ROLLBACK');
      throw error;
    }
  }
}
