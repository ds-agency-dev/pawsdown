import { useCallback, useState } from 'react';
import { Easing, type SharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { HOLD, IDLE, SKIP_TO } from './timeline';

/**
 * idle → filing (act one: cards file, win stamps, tally counts) → hold (stats stay up, LIGHTS OUT waits)
 * → night (act two: lights out, pet sleeps, tonight's panel) → done.
 */
export type ShutdownPhase = 'idle' | 'filing' | 'hold' | 'night' | 'done';

/** Drives the desk's sequence clock (`seq`, ms) through the two acts; React only hears about phase changes. */
export function useShutdown(seq: SharedValue<number>) {
  const [phase, setPhase] = useState<ShutdownPhase>('idle');

  // Plays seq linearly from `from` to `to` in real time. Setting seq directly (skip, reset) cancels it, and a
  // cancelled run reports finished = false, so it never overwrites the phase the skip chose.
  const play = useCallback(
    (from: number, to: number, next: ShutdownPhase) => {
      seq.set(from);
      seq.set(
        withTiming(to, { duration: to - from, easing: Easing.linear }, (finished) => {
          'worklet';
          if (finished) scheduleOnRN(setPhase, next);
        }),
      );
    },
    [seq],
  );

  const start = useCallback(() => {
    setPhase('filing');
    play(0, HOLD, 'hold');
  }, [play]);

  const lightsOut = useCallback(() => {
    setPhase('night');
    play(HOLD, SKIP_TO, 'done');
  }, [play]);

  /** Act one skips to the hold (the stats are the point); act two skips to the end. */
  const skip = useCallback(() => {
    if (phase === 'filing') {
      seq.set(HOLD);
      setPhase('hold');
    } else if (phase === 'night') {
      seq.set(SKIP_TO);
      setPhase('done');
    }
  }, [phase, seq]);

  const reset = useCallback(() => {
    seq.set(IDLE);
    setPhase('idle');
  }, [seq]);

  return { phase, start, lightsOut, skip, reset };
}
