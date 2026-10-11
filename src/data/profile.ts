import { COATS, type PetKind } from '@/render/bitmap';

import { limits } from './migrations';

/** What's hardest to switch off, in the order onboarding shows them. Migration 2 repeats this list. */
export const SWITCH_OFF = ['chat', 'email', 'tasks', 'meetings', 'laptop', 'weekend'] as const;
export type SwitchOff = (typeof SWITCH_OFF)[number];

export interface Workday {
  /** Minutes after local midnight, in 15-minute steps. */
  endMinute: number;
  /** Bit i set = weekday i is a workday, 0 = Sunday (Date#getDay). Never 0. */
  days: number;
  /** One notification on workdays, 15 minutes before the end. */
  nudge: boolean;
}

export interface Pet {
  species: PetKind;
  name: string;
  /** A key of COATS[species], e.g. 'tabby'. */
  coat: string;
}

export interface Profile {
  /** Null until onboarding finishes; the pet row is written last, so it doubles as the onboarded flag. */
  pet: Pet | null;
  workday: Workday;
  switchOff: SwitchOff[];
}

export interface ProfileDb {
  getFirstAsync<T>(source: string): Promise<T | null>;
  getAllAsync<T>(source: string): Promise<T[]>;
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: (string | number)[]): Promise<unknown>;
}

export const DEFAULT_WORKDAY: Workday = { endMinute: 17 * 60 + 30, days: 0b0111110, nudge: false };
export const DEFAULT_PET_NAMES: Readonly<Record<PetKind, string>> = { cat: 'Biscuit', dog: 'Waffles' };

export const MINUTES_PER_DAY = 24 * 60;
export const STEP_MINUTES = 15;

/** Trims; null when the name is empty or too long. */
export function cleanPetName(name: string): string | null {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= limits.petNameChars ? trimmed : null;
}

export function isCoat(species: PetKind, coat: string): boolean {
  return Object.keys(COATS[species]).includes(coat);
}

function record(row: unknown, what: string): Record<string, unknown> {
  if (typeof row !== 'object' || row === null) throw new Error(`${what} row missing`);
  return row as Record<string, unknown>;
}

export function parseWorkday(row: unknown): Workday {
  const r = record(row, 'workday');
  const { end_minute: end, days, nudge } = r;
  if (typeof end !== 'number' || !Number.isInteger(end) || end < 0 || end >= MINUTES_PER_DAY || end % STEP_MINUTES)
    throw new Error(`workday.end_minute is invalid: ${String(end)}`);
  if (typeof days !== 'number' || !Number.isInteger(days) || days < 1 || days > 127)
    throw new Error(`workday.days is invalid: ${String(days)}`);
  if (nudge !== 0 && nudge !== 1) throw new Error(`workday.nudge is not 0/1: ${String(nudge)}`);
  return { endMinute: end, days, nudge: nudge === 1 };
}

export function parsePet(row: unknown): Pet {
  const r = record(row, 'pet');
  const species = r.species === 'cat' || r.species === 'dog' ? r.species : null;
  if (!species) throw new Error(`pet.species is invalid: ${String(r.species)}`);
  const name = typeof r.name === 'string' ? cleanPetName(r.name) : null;
  if (name === null) throw new Error('pet.name is invalid');
  if (typeof r.coat !== 'string' || !isCoat(species, r.coat)) throw new Error(`pet.coat is invalid: ${String(r.coat)}`);
  return { species, name, coat: r.coat };
}

function parseSwitchOff(rows: unknown[]): SwitchOff[] {
  const picked = new Set(rows.map((row) => record(row, 'switch_off').topic));
  return SWITCH_OFF.filter((topic) => picked.has(topic));
}

export async function getProfile(db: ProfileDb): Promise<Profile> {
  const pet = await db.getFirstAsync('SELECT * FROM pet WHERE id = 1');
  return {
    pet: pet === null ? null : parsePet(pet),
    workday: parseWorkday(await db.getFirstAsync('SELECT * FROM workday WHERE id = 1')),
    switchOff: parseSwitchOff(await db.getAllAsync('SELECT topic FROM switch_off')),
  };
}

/** Saves every onboarding answer in one transaction, so a half-finished setup never counts as onboarded. */
export async function saveOnboarding(db: ProfileDb, answers: { pet: Pet; workday: Workday; switchOff: SwitchOff[] }) {
  const { workday, switchOff } = answers;
  const name = cleanPetName(answers.pet.name);
  if (name === null) throw new Error('Pet name is empty or too long');
  if (!isCoat(answers.pet.species, answers.pet.coat)) throw new Error(`Unknown coat ${answers.pet.coat}`);
  await db.execAsync('BEGIN');
  try {
    await db.runAsync('UPDATE workday SET end_minute = ?, days = ?, nudge = ? WHERE id = 1', [
      workday.endMinute,
      workday.days,
      Number(workday.nudge),
    ]);
    await db.execAsync('DELETE FROM switch_off');
    for (const topic of switchOff) await db.runAsync('INSERT INTO switch_off (topic) VALUES (?)', [topic]);
    await db.runAsync('INSERT OR REPLACE INTO pet (id, species, name, coat, created_at) VALUES (1, ?, ?, ?, ?)', [
      answers.pet.species,
      name,
      answers.pet.coat,
      Date.now(),
    ]);
    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

/** Dev only: forgets the onboarding answers so the flow can be run again. */
export async function clearOnboarding(db: ProfileDb) {
  await db.execAsync('BEGIN');
  try {
    await db.execAsync('DELETE FROM pet; DELETE FROM switch_off;');
    await db.runAsync('UPDATE workday SET end_minute = ?, days = ?, nudge = ? WHERE id = 1', [
      DEFAULT_WORKDAY.endMinute,
      DEFAULT_WORKDAY.days,
      Number(DEFAULT_WORKDAY.nudge),
    ]);
    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}
