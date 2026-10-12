import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useSyncExternalStore } from 'react';

import { clockOut, countEvenings, type Draft, emptyDraft, loadDraft, localDay, saveDraft } from './evening';
import type { ProfileDb } from './profile';

interface EveningState {
  draft: Draft;
  evenings: number;
}

// Same shape as the profile store: loaded in database init, read synchronously by the clock-out screens.
let current: EveningState | null = null;
const listeners = new Set<() => void>();

function apply(next: EveningState) {
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function read() {
  if (!current) throw new Error('Evening read before the database was initialised');
  return current;
}

/** Loads tonight's draft and the evening count into the store. Part of database init. */
export async function loadEvening(db: ProfileDb) {
  apply({ draft: await loadDraft(db, localDay(new Date())), evenings: await countEvenings(db) });
}

/** Applies an edit at once (typing must not lag), then persists it. */
export async function changeDraft(db: ProfileDb, patch: Partial<Omit<Draft, 'day'>>) {
  const state = read();
  const draft = { ...state.draft, ...patch };
  apply({ ...state, draft });
  try {
    await saveDraft(db, draft);
  } catch (error) {
    // Re-read rather than restore a snapshot, which could undo a later edit that did save.
    apply({ ...read(), draft: await loadDraft(db, state.draft.day) });
    throw error;
  }
}

/** Saves the evening, empties the draft and returns how many evenings there are now. */
export async function finishClockOut(db: ProfileDb, now = new Date()): Promise<number> {
  const evenings = await clockOut(db, read().draft, now.getTime());
  apply({ draft: emptyDraft(localDay(now)), evenings });
  return evenings;
}

export function useDraft(): Draft {
  return useSyncExternalStore(subscribe, () => read().draft);
}

export function useEveningCount(): number {
  return useSyncExternalStore(subscribe, () => read().evenings);
}

export function useUpdateDraft() {
  const db = useSQLiteContext();
  return useCallback((patch: Partial<Omit<Draft, 'day'>>) => changeDraft(db, patch), [db]);
}

export function useClockOut() {
  const db = useSQLiteContext();
  return useCallback(() => finishClockOut(db), [db]);
}
