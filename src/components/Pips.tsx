import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { menu, motion, palette } from '@/design/tokens';

import { StepFill } from './Stepped';

const A = menu.artPt;

interface PipsProps {
  readonly total?: number;
  readonly filled?: number;
  /** Pip size in points. */
  readonly size?: number;
}

/**
 * Square pips counting panels in an episode (or episodes in a season). Pair with words on screen ("Panel 3 of 5").
 * One night strip with the pips inset 1 art px apart, rather than the design's per-pip 2 px ring, which would
 * sit off the 3 pt art grid and double up between neighbours.
 */
export function Pips({ total = 5, filled = 0, size = 3 * A }: PipsProps) {
  return (
    <View style={styles.strip} accessible accessibilityRole="image" accessibilityLabel={`${filled} of ${total}`}>
      <StepFill color="night" />
      {Array.from({ length: total }, (_, i) => (
        <Pip key={i} on={i < filled} size={size} />
      ))}
    </View>
  );
}

function Pip({ on, size }: { readonly on: boolean; readonly size: number }) {
  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(1);
  const shown = useRef(on);

  useEffect(() => {
    // Only a pip that lights up after mount pops; a screen that opens on 3 of 5 just shows them.
    const lit = on && !shown.current;
    shown.current = on;
    if (lit && !reduceMotion) {
      pop.set(withSequence(withTiming(menu.pips.popScale, { duration: 0 }), withSpring(1, motion.springs.snap)));
    }
  }, [on, reduceMotion, pop]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <Animated.View
      style={[{ width: size, height: size, backgroundColor: on ? palette.lamp : palette.twilight }, popStyle]}
    />
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignSelf: 'flex-start', gap: A, padding: A },
});
