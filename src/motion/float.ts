import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  type SharedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * 0→1→0 sine glide, one leg per `halfPeriodMs`. The design system steps the bob (CSS steps(1)), but on device
 * the snap read as a glitch, so we glide instead. Stays 0 when disabled or under Reduce Motion.
 */
export function useFloat(enabled: boolean, halfPeriodMs: number, delayMs = 0): SharedValue<number> {
  const value = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const active = enabled && !reduceMotion;

  useEffect(() => {
    if (!active) {
      value.set(0);
      return;
    }
    const leg = withTiming(1, { duration: halfPeriodMs, easing: Easing.inOut(Easing.sin) });
    value.set(withDelay(delayMs, withRepeat(leg, -1, true)));
    return () => cancelAnimation(value);
  }, [active, halfPeriodMs, delayMs, value]);

  return value;
}
