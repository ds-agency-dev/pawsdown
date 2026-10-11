import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { menu, motion, palette } from '@/design/tokens';
import { tapHaptic } from '@/motion/haptics';
import { useStepLoop } from '@/motion/step-loop';

import { BUTTON_VARIANTS, type ButtonVariant } from './button-variants';
import { PixelText } from './PixelText';
import { StepFill } from './Stepped';

const A = menu.artPt;
// The face drops 2 art px onto its 3 art px underside, leaving the outline below it.
const DROP = 2 * A;

interface PixelButtonProps {
  readonly label: string;
  readonly variant?: ButtonVariant;
  /** Holds the pressed state (face dropped onto its underside). */
  readonly pressed?: boolean;
  /** Full width of its container; the screen's one primary action sits full width at the bottom. */
  readonly full?: boolean;
  /** 's' is the key-cap size, e.g. the weekday picker. */
  readonly size?: 'm' | 's';
  /** Glow every 2.4 s: the screen's one primary action. */
  readonly pulse?: boolean;
  readonly onPress?: () => void;
}

/** Stepped corners, night outline, a colored underside the face drops onto with the snap spring. */
export function PixelButton({ label, variant = 'primary', pressed = false, full = false, size = 'm', pulse = false, onPress }: PixelButtonProps) {
  const style = BUTTON_VARIANTS[variant];
  const disabled = variant === 'disabled';
  const rest = disabled || pressed ? 1 : 0;
  const reduceMotion = useReducedMotion();
  const drop = useSharedValue(rest);
  const glow = useStepLoop(pulse && !disabled, menu.pulse.restMs, menu.pulse.glowMs);

  useEffect(() => {
    drop.set(rest);
  }, [rest, drop]);

  const moveTo = (target: number) => {
    drop.set(reduceMotion ? target : withSpring(target, motion.springs.snap));
  };

  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drop.value * DROP }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <Pressable
      style={full ? styles.full : styles.inline}
      disabled={disabled}
      onPressIn={() => {
        moveTo(1);
        tapHaptic();
      }}
      onPressOut={() => moveTo(rest)}
      onPress={onPress}
      hitSlop={A}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}>
      <View style={styles.body}>
        <StepFill color="night" />
        {style.underside && <View style={[styles.underside, { backgroundColor: palette[style.underside] }]} />}
        <Animated.View style={[styles.face, size === 's' ? styles.faceSmall : !full && styles.faceMinWidth, faceStyle]}>
          <StepFill color={style.face} />
          {pulse && (
            <Animated.View style={[StyleSheet.absoluteFill, glowStyle]} pointerEvents="none">
              <StepFill color="glow" />
            </Animated.View>
          )}
          <PixelText text={label} px={menu.textPx.label} color={style.ink} decorative />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inline: { alignSelf: 'flex-start' },
  full: { alignSelf: 'stretch' },
  body: { paddingTop: A, paddingHorizontal: A, paddingBottom: 3 * A },
  underside: { position: 'absolute', left: A, right: A, bottom: A, height: 3 * A },
  face: {
    minHeight: menu.minTouchPt,
    paddingVertical: 4 * A,
    paddingHorizontal: 8 * A,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceMinWidth: { minWidth: 40 * A },
  faceSmall: { paddingVertical: 3 * A, paddingHorizontal: 4 * A },
});
