import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { menu, motion, palette } from '@/design/tokens';
import { toggleFeedback } from '@/motion/feedback';

import { StepFill } from './Stepped';

const A = menu.artPt;
const TRAVEL = 8 * A;

interface PixelToggleProps {
  readonly on?: boolean;
  /** The same words as the row's visible label. */
  readonly label: string;
  /** Applies at once; there is no save button. */
  readonly onToggle?: () => void;
}

/** A pixel on/off switch for settings rows: mint when on, plum when off. */
export function PixelToggle({ on = false, label, onToggle }: PixelToggleProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(on ? 1 : 0);

  useEffect(() => {
    const target = on ? 1 : 0;
    progress.set(reduceMotion ? target : withSpring(target, motion.springs.snap));
  }, [on, reduceMotion, progress]);

  // The track flips color as the knob crosses the middle, not when the finger lifts.
  const fillStyle = useAnimatedStyle(() => ({ backgroundColor: progress.value > 0.5 ? palette.mint : palette.plum }));
  const knobStyle = useAnimatedStyle(() => {
    // sin(πp) is 0 at both stops, positive in flight (stretch) and negative past a stop on overshoot (squash).
    const stretch = 1 + menu.toggle.stretch * Math.sin(Math.PI * progress.value);
    return { transform: [{ translateX: progress.value * TRAVEL }, { scaleX: stretch }, { scaleY: 2 - stretch }] };
  });

  return (
    <Pressable
      style={styles.root}
      onPress={() => {
        toggleFeedback(!on);
        onToggle?.();
      }}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}>
      <View style={styles.track}>
        <StepFill color="night" />
        <Animated.View style={[styles.fill, fillStyle]} />
        <Animated.View style={[styles.knob, knobStyle]}>
          <View style={styles.knobFace} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { minWidth: 18 * A, minHeight: menu.minTouchPt, alignItems: 'center', justifyContent: 'center' },
  track: { width: 18 * A, height: 10 * A },
  fill: { position: 'absolute', top: A, right: A, bottom: A, left: A },
  knob: { position: 'absolute', top: A, left: A, padding: A, backgroundColor: palette.night },
  knobFace: { width: 6 * A, height: 6 * A, backgroundColor: palette.paper },
});
