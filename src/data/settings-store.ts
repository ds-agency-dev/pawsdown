import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useSyncExternalStore } from 'react';

import { setSoundEnabled } from '@/audio/sounds';
import { setHapticsEnabled } from '@/motion/haptics';

import { getSettings, type Settings, type SettingsDb, updateSettings } from './settings';

// The one app-wide store: settings are read all over (feedback, text, CRT) and change from a single screen.
let current: Settings | null = null;
const listeners = new Set<() => void>();

function apply(next: Settings) {
  current = next;
  setSoundEnabled(next.sound);
  setHapticsEnabled(next.haptics);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function read() {
  // SQLiteProvider renders no children until initDatabase (which loads settings) has finished.
  if (!current) throw new Error('Settings read before the database was initialised');
  return current;
}

/** Loads the persisted settings into the store. Part of database init. */
export async function loadSettings(db: SettingsDb) {
  apply(await getSettings(db));
}

/** Applies a change at once (so toggles feel instant), then persists it. */
export async function changeSettings(db: SettingsDb, patch: Partial<Settings>) {
  apply({ ...read(), ...patch });
  try {
    await updateSettings(db, patch);
  } catch (error) {
    // Re-read rather than restore a snapshot, which could undo a later change that did save.
    apply(await getSettings(db));
    throw error;
  }
}

/** One setting; the component re-renders only when that value changes. */
export function useSetting<K extends keyof Settings>(key: K): Settings[K] {
  return useSyncExternalStore(subscribe, () => read()[key]);
}

export function useChangeSettings() {
  const db = useSQLiteContext();
  return useCallback((patch: Partial<Settings>) => changeSettings(db, patch), [db]);
}
