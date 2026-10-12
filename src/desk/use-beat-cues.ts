import { type SharedValue, useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { beatFeedback } from '@/motion/feedback';

import type { Cue } from './timeline';

/** A frame-to-frame jump bigger than this is a skip, not playback: the beats it passes stay silent. */
const SKIP_GAP_MS = 120;

/**
 * Plays each cue as the sequence clock passes it. Watched on the UI thread (where `seq` runs) so cues land on the
 * frame their motion does; only the play call hops to JS.
 */
export function useBeatCues(seq: SharedValue<number>, cues: readonly Cue[]) {
  useAnimatedReaction(
    () => seq.value,
    (t, prev) => {
      if (prev === null || t < 0 || t <= prev || t - prev > SKIP_GAP_MS) return;
      for (const c of cues) if (c.t > prev && c.t <= t) scheduleOnRN(beatFeedback, c.cue);
    },
    [cues],
  );
}
