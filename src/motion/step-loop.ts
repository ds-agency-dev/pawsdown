import { useEffect } from 'react';
import {
  cancelAnimation,
  type SharedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/**
 * A 0/1 value that holds 0 for `offMs`, snaps to 1 for `onMs`, forever — the CSS `steps(1)` loops of the
 * design system (button glow). Runs on the UI thread; stays 0 when disabled or under Reduce Motion.
 */
export function useStepLoop(enabled: boolean, offMs: number, onMs: number, delayMs = 0): SharedValue<number> {
  const value = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const active = enabled && !reduceMotion;

  useEffect(() => {
    if (!active) {
      value.set(0);
      return;
    }
    const cycle = withSequence(
      withDelay(offMs, withTiming(1, { duration: 0 })),
      withDelay(onMs, withTiming(0, { duration: 0 })),
    );
    value.set(withDelay(delayMs, withRepeat(cycle, -1)));
    return () => cancelAnimation(value);
  }, [active, offMs, onMs, delayMs, value]);

  return value;
}
