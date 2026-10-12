import type { SwitchOff } from '@/data/profile';
import { SWITCH_OFF_COPY } from '@/onboarding/copy';

/** Quick starts for the win (mockup 12). Tapping one fills the ticket so it can be finished or sent as is. */
export const WIN_STARTERS = [
  'Shipped something',
  'Helped someone',
  'Said no to something',
  'Just got through it',
] as const;

export interface BoundaryMove {
  readonly text: string;
  /** The small line under it: which switch-off worry it answers, or "A classic". */
  readonly why: string;
}

// One move per switch-off topic (mockup 13 has chat, tasks and the classic; the rest follow its voice: small,
// physical, doable tonight). Brand names stay out of the moves themselves.
const BY_TOPIC: Readonly<Record<SwitchOff, string>> = {
  chat: 'Mute chat until the morning',
  email: 'Sign out of work email on your phone',
  tasks: 'Write one line about where you left off',
  meetings: 'Jot down the thing you wish you had said, then let it go',
  laptop: 'Close the laptop and put it out of sight',
  weekend: 'Turn off work notifications until Monday',
};

const CLASSIC = 'Close the laptop and put it out of sight';

/**
 * The moves to offer: the user's onboarding picks first (in onboarding order), then the classic if it isn't
 * already there, at most three so the list fits above the fold on the smallest phone.
 */
export function boundaryMoves(switchOff: readonly SwitchOff[]): BoundaryMove[] {
  // Skipped the onboarding question: the mockup's pair.
  const topics: readonly SwitchOff[] = switchOff.length > 0 ? switchOff : ['chat', 'tasks'];
  const moves: BoundaryMove[] = topics.map((topic) => ({
    text: BY_TOPIC[topic],
    why: `For: ${SWITCH_OFF_COPY[topic].title}`,
  }));
  const picked = moves.slice(0, 2);
  if (!picked.some((m) => m.text === CLASSIC)) picked.push({ text: CLASSIC, why: 'A classic' });
  else if (moves[2]) picked.push(moves[2]);
  return picked;
}
