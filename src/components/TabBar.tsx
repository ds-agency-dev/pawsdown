import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ICONS } from '@/design/icons';
import { menu, motion, palette } from '@/design/tokens';
import { selectFeedback } from '@/motion/feedback';
import { textWidth } from '@/render/bitmap';

import { Icon } from './Icon';
import { PixelText } from './PixelText';

const A = menu.artPt;
const ICON_SCALE = 3;

export const TABS = [
  { key: 'desk', label: 'Desk' },
  { key: 'episodes', label: 'Episodes' },
  { key: 'room', label: 'Room' },
  { key: 'settings', label: 'Settings' },
] as const;

// Tabs share the row's spare width equally on top of their own width, so the outer labels inset evenly from
// both edges (equal slots left short DESK floating and long SETTINGS hugging the right). Widths are known
// statically from the bitmap metrics, so the lamp bar can find each tab without measuring layout.
const CONTENT = TABS.map((t) =>
  Math.max(ICONS[t.key][0].length * ICON_SCALE, textWidth(t.label) * menu.textPx.label),
);
const CONTENT_SUM = CONTENT.reduce((a, b) => a + b, 0);
// Centre of tab i, minus its share of the spare width: centre(i) = FIXED_CENTRE[i] + (i + 0.5) * spare.
const FIXED_CENTRE = CONTENT.map((c, i) => CONTENT.slice(0, i).reduce((a, b) => a + b, 0) + c / 2);

export type TabKey = (typeof TABS)[number]['key'];

interface TabBarProps {
  readonly active: TabKey;
  readonly onSelect?: (tab: TabKey) => void;
}

/**
 * The app's four destinations, on night over the home indicator. Hide it during the clock-out flow, onboarding
 * and the episode player so the ritual has no exits. The lamp bar slides to the picked tab and its icon hops.
 */
export function TabBar({ active, onSelect }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const index = TABS.findIndex((t) => t.key === active);
  const slot = useSharedValue(index);
  const rowWidth = useSharedValue(0);

  useEffect(() => {
    slot.set(reduceMotion ? index : withSpring(index, motion.springs.settle));
  }, [index, reduceMotion, slot]);

  // The bar is 40% of an even share of the row (the design's width), centred under the active tab; between
  // tabs (mid-spring) it moves linearly from one centre to the next.
  const barStyle = useAnimatedStyle(() => {
    const w = (rowWidth.value / TABS.length) * 0.4;
    const spare = (rowWidth.value - CONTENT_SUM) / TABS.length;
    const s = slot.value;
    const i0 = Math.min(Math.max(Math.floor(s), 0), TABS.length - 1);
    const i1 = Math.min(i0 + 1, TABS.length - 1);
    const c0 = FIXED_CENTRE[i0] ?? 0;
    const fixed = c0 + ((FIXED_CENTRE[i1] ?? c0) - c0) * (s - i0);
    return { width: w, transform: [{ translateX: fixed + (s + 0.5) * spare - w / 2 }] };
  });

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]} accessibilityRole="tablist">
      <View style={styles.rule} />
      <View style={styles.row} onLayout={(e) => rowWidth.set(e.nativeEvent.layout.width)}>
        <Animated.View style={[styles.bar, barStyle]} pointerEvents="none" />
        {TABS.map((tab, i) => (
          <Tab
            key={tab.key}
            tab={tab}
            width={CONTENT[i] ?? 0}
            on={tab.key === active}
            onPress={() => {
              if (tab.key === active) return;
              selectFeedback();
              onSelect?.(tab.key);
            }}
          />
        ))}
      </View>
    </View>
  );
}

interface TabProps {
  readonly tab: (typeof TABS)[number];
  readonly on: boolean;
  readonly onPress: () => void;
  /** Natural width; the tab grows from it by an equal share of the spare row width. */
  readonly width: number;
}

function Tab({ tab, on, onPress, width }: TabProps) {
  const reduceMotion = useReducedMotion();
  const hop = useSharedValue(0);
  const shown = useRef(on);

  useEffect(() => {
    const picked = on && !shown.current;
    shown.current = on;
    if (picked && !reduceMotion) {
      hop.set(withSequence(withTiming(-menu.tabs.hopPt, { duration: 0 }), withSpring(0, motion.springs.snap)));
    }
  }, [on, reduceMotion, hop]);

  const hopStyle = useAnimatedStyle(() => ({ transform: [{ translateY: hop.value }] }));

  return (
    <Pressable
      style={[styles.item, { flexBasis: width }]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: on }}>
      <Animated.View style={hopStyle}>
        <Icon name={tab.key} scale={ICON_SCALE} tint={on ? undefined : 'smoke'} />
      </Animated.View>
      <PixelText text={tab.label} px={menu.textPx.label} color={on ? 'glow' : 'smoke'} decorative />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: palette.night },
  rule: { height: A, backgroundColor: palette.twilight },
  row: { flexDirection: 'row', paddingTop: 2 * A },
  // Overlays the twilight rule (just above the row) over the active tab.
  bar: { position: 'absolute', top: -A, left: 0, height: A, backgroundColor: palette.lamp },
  item: {
    flexGrow: 1,
    flexShrink: 1,
    alignItems: 'center',
    gap: 2 * A,
    paddingTop: 2 * A,
    paddingBottom: 3 * A,
    minHeight: menu.minTouchPt,
  },
});
