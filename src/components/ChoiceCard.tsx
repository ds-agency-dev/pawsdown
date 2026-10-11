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

import { fonts, menu, motion, palette } from '@/design/tokens';
import { useFloat } from '@/motion/float';
import { pickFeedback } from '@/motion/feedback';
import type { Coat } from '@/render/bitmap';
import type { SpriteName } from '@/render/pixel-art';

import { PixelText } from './PixelText';
import { Sprite } from './Sprite';
import { StepFill } from './Stepped';

const A = menu.artPt;
const { snap } = motion.springs;

interface ChoiceCardProps {
  /** One to three words in the bitmap font. */
  readonly title: string;
  /** The same thing in plain words. */
  readonly caption?: string;
  readonly selected?: boolean;
  /** Position in its row; picks the resting sway so neighbours never move in step. */
  readonly index?: number;
  /** Title characters per line. */
  readonly wrap?: number;
  /** A pet above the title, for the cat-or-dog question. */
  readonly sprite?: SpriteName;
  readonly coat?: Coat;
  readonly spriteScale?: number;
  readonly onSelect?: () => void;
}

/**
 * A pickable card, two or three to a row. It sways a little at rest; picking lifts and straightens it with the
 * snap spring and slaps on a PICKED stamp. Wrap each card in a `flex: 1` view so a row shares width and height.
 */
export function ChoiceCard({
  title,
  caption,
  selected = false,
  index = 0,
  wrap = 10,
  sprite,
  coat,
  spriteScale = 2,
  onSelect,
}: ChoiceCardProps) {
  const reduceMotion = useReducedMotion();
  const sway = menu.sway[index % menu.sway.length] ?? menu.sway[0];
  const swing = useFloat(!selected, sway.periodMs / 2);
  const lift = useSharedValue(selected ? 1 : 0);
  const kick = useSharedValue(0);
  const pop = useSharedValue(1);
  const stampPop = useSharedValue(1);
  const shown = useRef(selected);

  useEffect(() => {
    const target = selected ? 1 : 0;
    // Only a change of pick animates; a card that mounts picked just sits lifted.
    const changed = shown.current !== selected;
    shown.current = selected;
    if (!changed || reduceMotion) {
      lift.set(target);
      return;
    }
    lift.set(withSpring(target, snap));
    if (selected) {
      kick.set(withSequence(withTiming(menu.pick.kickDeg, { duration: 0 }), withSpring(0, snap)));
      pop.set(withSequence(withTiming(menu.pick.popScale, { duration: 0 }), withSpring(1, snap)));
      stampPop.set(withSequence(withTiming(menu.pick.stampPopScale, { duration: 0 }), withSpring(1, snap)));
    }
  }, [selected, reduceMotion, lift, kick, pop, stampPop]);

  const cardStyle = useAnimatedStyle(() => {
    // The rest tilt fades out as the card lifts, so it straightens on the same spring. Reduce Motion: no tilt.
    const rest = reduceMotion ? 0 : (sway.fromDeg + (sway.toDeg - sway.fromDeg) * swing.value) * (1 - lift.value);
    return {
      transform: [
        { translateY: -lift.value * menu.pick.liftPt },
        { rotate: `${rest + kick.value}deg` },
        { scale: pop.value },
      ],
    };
  });
  const stampStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${menu.pick.stampDeg}deg` }, { scale: stampPop.value }],
  }));

  return (
    <Pressable
      style={styles.root}
      onPress={() => {
        pickFeedback(!selected);
        onSelect?.();
      }}
      accessibilityRole="button"
      accessibilityLabel={caption ? `${title}, ${caption}` : title}
      accessibilityState={{ selected }}>
      <Animated.View style={[styles.card, cardStyle]}>
        {/* Picked: a thick lamp border. Otherwise a 1 art px night outline inside the same footprint. */}
        {selected && <StepFill color="lamp" />}
        <View style={styles.outline}>
          <StepFill color={selected ? 'lamp' : 'night'} />
          <View style={styles.face}>
            {/* Dark at rest so a row of cards never glares on the twilight panel; only the pick lights up. */}
            <StepFill color={selected ? 'candle' : 'dusk'} />
            {sprite && (
              <View style={styles.art}>
                <Sprite name={sprite} coat={coat} scale={spriteScale} />
              </View>
            )}
            <PixelText
              text={title}
              px={menu.textPx.label}
              color={selected ? 'night' : 'paper'}
              wrap={wrap}
              decorative
            />
            {caption && <Text style={[styles.caption, selected && styles.captionPicked]}>{caption}</Text>}
          </View>
        </View>
      </Animated.View>
      {selected && (
        <Animated.View style={[styles.stamp, stampStyle]} pointerEvents="none">
          <StepFill color="night" />
          <View style={styles.stampFace}>
            <StepFill color="mint" />
            <PixelText text="Picked" px={menu.textPx.label} color="night" decorative />
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, paddingBottom: 3 * A },
  // Pivot at the bottom edge so the sway rocks the card like it is standing on the table.
  card: { flexGrow: 1, padding: A, transformOrigin: '50% 100%' },
  outline: { flexGrow: 1, padding: A },
  face: { flexGrow: 1, minHeight: 28 * A, padding: 4 * A, gap: 2 * A },
  art: { alignSelf: 'center' },
  caption: {
    fontFamily: fonts.ui,
    fontSize: 13,
    lineHeight: 17,
    color: palette.parchment,
  },
  captionPicked: { color: palette.plum },
  stamp: {
    position: 'absolute',
    right: -3 * A,
    top: -9 * A,
    zIndex: 2,
    padding: A,
  },
  stampFace: { paddingVertical: 2 * A, paddingHorizontal: 3 * A },
});
