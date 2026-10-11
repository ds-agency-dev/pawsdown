import { createContext, type ReactNode, use, useState } from 'react';

import { DEFAULT_PET_NAMES, DEFAULT_WORKDAY, type SwitchOff } from '@/data/profile';
import { COATS, type Coat, type PetKind } from '@/render/bitmap';

/** Answers so far. Nothing is saved until the last step, so quitting halfway starts fresh next launch. */
export interface Draft {
  endMinute: number;
  days: number;
  switchOff: readonly SwitchOff[];
  species: PetKind | null;
  // Kept per species so flipping between cat and dog never loses a typed name or picked coat.
  coats: Readonly<Record<PetKind, string>>;
  names: Readonly<Record<PetKind, string>>;
  analytics: boolean;
}

const INITIAL: Draft = {
  endMinute: DEFAULT_WORKDAY.endMinute,
  days: DEFAULT_WORKDAY.days,
  switchOff: [],
  species: null,
  coats: { cat: 'tabby', dog: 'golden' },
  names: DEFAULT_PET_NAMES,
  analytics: false,
};

type DraftContextValue = readonly [Draft, (update: (draft: Draft) => Draft) => void];

const DraftContext = createContext<DraftContextValue | null>(null);

export function DraftProvider({ children }: { readonly children: ReactNode }) {
  const [draft, setDraft] = useState(INITIAL);
  return <DraftContext value={[draft, setDraft]}>{children}</DraftContext>;
}

export function useDraft(): DraftContextValue {
  const value = use(DraftContext);
  if (!value) throw new Error('useDraft outside DraftProvider');
  return value;
}

/** The coat a sprite needs for a species and coat name. */
export function coatFor(species: PetKind, coat: string): Coat {
  const recolor = (COATS[species] as Readonly<Record<string, Coat['recolor']>>)[coat] ?? {};
  return { key: `${species}.${coat}`, recolor };
}
