import type { SwitchOff } from '@/data/profile';
import type { COATS, PetKind } from '@/render/bitmap';

export const SWITCH_OFF_COPY: Readonly<Record<SwitchOff, { title: string; caption: string }>> = {
  chat: { title: 'Slack and chat', caption: 'Pings after hours' },
  email: { title: 'Email', caption: 'Just one more check' },
  tasks: { title: 'Unfinished tasks', caption: 'The half-done stuff' },
  meetings: { title: 'Replaying meetings', caption: 'What I should have said' },
  laptop: { title: 'The laptop', caption: "It's right there" },
  weekend: { title: 'Weekend pings', caption: 'Saturday Slack' },
};

export const COAT_NAMES: { readonly [K in PetKind]: Readonly<Record<keyof (typeof COATS)[K], string>> } = {
  cat: { tabby: 'Orange tabby', grey: 'Grey', cream: 'Cream', tuxedo: 'Tuxedo' },
  dog: { golden: 'Golden', black: 'Black', cream: 'Cream', spotted: 'Spotted' },
};

export const SPECIES_COPY: Readonly<Record<PetKind, { title: string; caption: string }>> = {
  cat: { title: 'Cat', caption: 'Naps on your keyboard' },
  dog: { title: 'Dog', caption: 'Waits by the door' },
};

/** Monday first, as people read a work week; `bit` is the Date#getDay index used in the workday mask. */
export const WEEKDAYS = [
  { key: 'M', name: 'Monday', bit: 1 },
  { key: 'T', name: 'Tuesday', bit: 2 },
  { key: 'W', name: 'Wednesday', bit: 3 },
  { key: 'T', name: 'Thursday', bit: 4 },
  { key: 'F', name: 'Friday', bit: 5 },
  { key: 'S', name: 'Saturday', bit: 6 },
  { key: 'S', name: 'Sunday', bit: 0 },
] as const;
