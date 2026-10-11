import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useSyncExternalStore } from 'react';

import { clearOnboarding, getProfile, type Pet, type Profile, type ProfileDb, saveOnboarding } from './profile';

// Same shape as the settings store: loaded in database init, read synchronously by every screen.
let current: Profile | null = null;
const listeners = new Set<() => void>();

function apply(next: Profile) {
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function read() {
  if (!current) throw new Error('Profile read before the database was initialised');
  return current;
}

/** Loads the pet and workday into the store. Part of database init. */
export async function loadProfile(db: ProfileDb) {
  apply(await getProfile(db));
}

/** Writes the answers, then re-reads them, so the store only ever holds what the database accepted. */
export async function finishOnboarding(db: ProfileDb, answers: Parameters<typeof saveOnboarding>[1]) {
  await saveOnboarding(db, answers);
  await loadProfile(db);
}

export async function resetOnboarding(db: ProfileDb) {
  await clearOnboarding(db);
  await loadProfile(db);
}

export function useOnboarded(): boolean {
  return useSyncExternalStore(subscribe, () => read().pet !== null);
}

export function usePet(): Pet | null {
  return useSyncExternalStore(subscribe, () => read().pet);
}

export function useFinishOnboarding() {
  const db = useSQLiteContext();
  return useCallback((answers: Parameters<typeof saveOnboarding>[1]) => finishOnboarding(db, answers), [db]);
}

export function useResetOnboarding() {
  const db = useSQLiteContext();
  return useCallback(() => resetOnboarding(db), [db]);
}
