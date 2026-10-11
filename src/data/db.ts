import type { SQLiteDatabase } from 'expo-sqlite';

import { migrate } from './migrations';
import { loadSettings } from './settings-store';

/** Lives in expo-sqlite's default directory, Documents/SQLite on iOS, which device backup covers. */
export const DATABASE_NAME = 'pawsdown.db';

/** SQLiteProvider `onInit`: per-connection pragmas, migrations, then the settings every screen reads. */
export async function initDatabase(db: SQLiteDatabase) {
  // Foreign keys are off by default per connection; WAL keeps reads from blocking the clock-out write.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrate(db);
  await loadSettings(db);
}
