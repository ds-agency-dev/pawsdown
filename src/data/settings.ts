export type ScreenEffect = 'full' | 'soft' | 'off';

export interface Settings {
  /** Swaps pixel type for Atkinson Hyperlegible. */
  easyRead: boolean;
  screenEffect: ScreenEffect;
  haptics: boolean;
  sound: boolean;
  analytics: boolean;
}

export interface SettingsDb {
  getFirstAsync<T>(source: string): Promise<T | null>;
  runAsync(source: string, params: (string | number)[]): Promise<unknown>;
}

// Fixed map from field to column: the only names ever spliced into SQL.
const COLUMNS = {
  easyRead: 'easy_read',
  screenEffect: 'screen_effect',
  haptics: 'haptics',
  sound: 'sound',
  analytics: 'analytics',
} as const satisfies Record<keyof Settings, string>;

const SCREEN_EFFECTS: readonly ScreenEffect[] = ['full', 'soft', 'off'];

function flag(row: Record<string, unknown>, column: string) {
  const v = row[column];
  if (v !== 0 && v !== 1) throw new Error(`settings.${column} is not 0/1: ${String(v)}`);
  return v === 1;
}

/** Validates a raw settings row; the database is a boundary too (restores, older builds). */
export function parseSettings(row: unknown): Settings {
  if (typeof row !== 'object' || row === null) throw new Error('settings row missing');
  const r = row as Record<string, unknown>;
  const effect = SCREEN_EFFECTS.find((e) => e === r.screen_effect);
  if (!effect) throw new Error(`settings.screen_effect is invalid: ${String(r.screen_effect)}`);
  return {
    easyRead: flag(r, COLUMNS.easyRead),
    screenEffect: effect,
    haptics: flag(r, COLUMNS.haptics),
    sound: flag(r, COLUMNS.sound),
    analytics: flag(r, COLUMNS.analytics),
  };
}

export async function getSettings(db: SettingsDb) {
  return parseSettings(await db.getFirstAsync('SELECT * FROM settings WHERE id = 1'));
}

export async function updateSettings(db: SettingsDb, patch: Partial<Settings>) {
  const fields = (Object.keys(patch) as (keyof Settings)[]).filter((k) => patch[k] !== undefined);
  if (fields.length === 0) return;
  const sets = fields.map((k) => `${COLUMNS[k]} = ?`).join(', ');
  const values = fields.map((k) => {
    const v = patch[k];
    return typeof v === 'boolean' ? Number(v) : (v as ScreenEffect);
  });
  await db.runAsync(`UPDATE settings SET ${sets} WHERE id = 1`, values);
}
