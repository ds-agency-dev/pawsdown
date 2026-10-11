import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { IconName } from '@/design/icons';
import { fonts, menu, motion, palette } from '@/design/tokens';
import { selectFeedback } from '@/motion/feedback';

import { Icon } from './Icon';
import { PixelText, useDisplayFont } from './PixelText';
import { StepFill } from './Stepped';

const A = menu.artPt;
const { snap } = motion.springs;

interface OptionCyclerProps {
  readonly label: string;
  readonly value: string;
  /** 'l' is the big centered value (onboarding clock); its label is only spoken. */
  readonly size?: 'm' | 'l';
  /** The consumer wraps around at the ends. */
  readonly onPrev?: () => void;
  readonly onNext?: () => void;
}

interface ArrowProps {
  readonly icon: IconName;
  readonly scale: number;
  readonly label: string;
  readonly onPress?: () => void;
}

function Arrow({ icon, scale, label, onPress }: ArrowProps) {
  const reduceMotion = useReducedMotion();
  const drop = useSharedValue(0);
  const moveTo = (target: number) => drop.set(reduceMotion ? target : withSpring(target, snap));
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: drop.value * A }] }));

  return (
    <Pressable
      style={styles.arrow}
      onPressIn={() => {
        moveTo(1);
        selectFeedback();
      }}
      onPressOut={() => moveTo(0)}
      onPress={onPress}
      // 32pt wide in the design; slop brings the touch target to 44pt.
      hitSlop={{ left: 6, right: 6 }}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <Animated.View style={style}>
        <Icon name={icon} scale={scale} />
      </Animated.View>
    </Pressable>
  );
}

/** A value stepped through with arrows, like a game's options menu. For 2 to 6 known values. */
export function OptionCycler({ label, value, size = 'm', onPrev, onNext }: OptionCyclerProps) {
  const fontFamily = useDisplayFont();
  const big = size === 'l';
  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(1);
  const shown = useRef(value);

  useEffect(() => {
    if (shown.current === value) return;
    shown.current = value;
    if (!reduceMotion) pop.set(withSequence(withTiming(menu.cycler.popScale, { duration: 0 }), withSpring(1, snap)));
  }, [value, reduceMotion, pop]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const name = label.toLowerCase();

  return (
    <View style={big ? styles.big : styles.row}>
      {!big && (
        <Text style={[styles.label, { fontFamily }]} importantForAccessibility="no" accessibilityElementsHidden>
          {label}
        </Text>
      )}
      <View style={styles.ctrl}>
        <Arrow icon="prev" scale={big ? 4 : 3} label={`Previous ${name}`} onPress={onPrev} />
        {/* VoiceOver gets the native adjustable control: swipe up/down to step. */}
        <View
          style={styles.box}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ text: value }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'increment') onNext?.();
            else if (event.nativeEvent.actionName === 'decrement') onPrev?.();
          }}>
          <StepFill color="night" />
          <View style={[styles.value, big && styles.valueBig]}>
            <StepFill color="dusk" />
            <Animated.View style={popStyle}>
              <PixelText text={value} px={big ? 4 : 2} color="glow" shadow="night" decorative />
            </Animated.View>
          </View>
        </View>
        <Arrow icon="next" scale={big ? 4 : 3} label={`Next ${name}`} onPress={onNext} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 3 * A,
    minHeight: menu.minTouchPt,
  },
  big: { flexDirection: 'row', justifyContent: 'center' },
  label: { flexShrink: 1, fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: palette.paper },
  ctrl: { flexDirection: 'row', alignItems: 'center', gap: A },
  arrow: { minWidth: 32, minHeight: menu.minTouchPt, alignItems: 'center', justifyContent: 'center' },
  box: { padding: A },
  value: { minWidth: 28 * A, padding: 3 * A, alignItems: 'center', justifyContent: 'center' },
  valueBig: { minWidth: 60 * A, paddingVertical: 5 * A, paddingHorizontal: 6 * A },
});
