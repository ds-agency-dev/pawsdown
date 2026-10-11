import { type ReactNode, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  type SharedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useSetting } from '@/data/settings-store';
import { menu, palette } from '@/design/tokens';
import { typeFeedback } from '@/motion/feedback';
import { useStepLoop } from '@/motion/step-loop';
import { ADVANCE, GLYPH_H, GLYPH_W, wrapText } from '@/render/bitmap';

import { PixelText } from './PixelText';
import { StepFill } from './Stepped';

const A = menu.artPt;
const LINE_GAP = 2 * A;

interface SpeechBubbleProps {
  /** One or two short sentences. The screen's accessible text should also carry a real question. */
  readonly text: string;
  /** Type it out a character at a time with a blinking cursor; a tap finishes it. */
  readonly typing?: boolean;
  /** Points at the pet: 'left' when it sits beside the bubble, 'bottom' when it is below. */
  readonly tail?: 'left' | 'bottom';
  /** Characters per line: 17 beside the pet on a phone, 24 when the bubble spans the screen. */
  readonly wrap?: number;
  /** Points per font pixel. */
  readonly px?: number;
}

/** The pet talking. Under Easy read the whole line shows at once: typing is a per-glyph reveal of bitmap text. */
export function SpeechBubble(props: SpeechBubbleProps) {
  return useSetting('easyRead') ? <EasyBubble {...props} /> : <TypedBubble {...props} />;
}

function EasyBubble({ text, tail = 'left', wrap = 17, px = 2 }: SpeechBubbleProps) {
  return (
    <BubbleFrame tail={tail} text={text}>
      <PixelText text={text} px={px} wrap={wrap} color="paper" decorative />
    </BubbleFrame>
  );
}

interface BubbleFrameProps {
  readonly text: string;
  readonly tail: 'left' | 'bottom';
  readonly children: ReactNode;
  readonly onPress?: () => void;
}

// Dark rather than the design's paper bubble: no large light surfaces on purple (DECISIONS).
function BubbleFrame({ text, tail, children, onPress }: BubbleFrameProps) {
  return (
    <Pressable
      style={styles.root}
      disabled={!onPress}
      onPress={onPress}
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}>
      <View style={styles.box}>
        <StepFill color="night" />
        <View style={styles.face}>
          <StepFill color="dusk" />
          {children}
        </View>
      </View>
      <View style={tail === 'left' ? styles.tailLeft : styles.tailBottom} pointerEvents="none">
        <View style={tail === 'left' ? styles.tailLeftFace : styles.tailBottomFace} />
      </View>
    </Pressable>
  );
}

/**
 * Bitmap speech. Lines are laid out at full length from the start and revealed by clipping on the UI thread, so the bubble
 * never reflows and typing never re-renders React.
 */
function TypedBubble({ text, typing = false, tail = 'left', wrap = 17, px = 2 }: SpeechBubbleProps) {
  const reduceMotion = useReducedMotion();
  const lines = useMemo(() => wrapText(text, wrap), [text, wrap]);
  const starts = useMemo(() => lines.map((_, i) => lines.slice(0, i).reduce((n, l) => n + l.length, 0)), [lines]);
  const total = lines.reduce((n, l) => n + l.length, 0);
  const animate = typing && !reduceMotion;

  const shown = useSharedValue(animate ? 0 : total);
  const blink = useStepLoop(typing, menu.speech.blinkMs, menu.speech.blinkMs);

  useEffect(() => {
    if (!animate) {
      shown.set(total);
      return;
    }
    shown.set(0);
    shown.set(withTiming(total, { duration: total * menu.speech.charMs, easing: Easing.linear }));
    return () => cancelAnimation(shown);
  }, [animate, total, text, shown]);

  // Blip as characters appear (not on the tap that finishes the line, which jumps straight to the end).
  useAnimatedReaction(
    () => Math.floor(shown.value),
    (n, prev) => {
      if (prev !== null && n > prev && n < total && n % menu.speech.blipEvery === 0) scheduleOnRN(typeFeedback);
    },
  );

  const cursorStyle = useAnimatedStyle(() => {
    const n = Math.floor(shown.value);
    let line = 0;
    for (let i = 1; i < starts.length; i++) if (n >= (starts[i] ?? Infinity)) line = i;
    const col = n - (starts[line] ?? 0);
    return {
      opacity: 1 - blink.value,
      transform: [{ translateX: col * ADVANCE * px }, { translateY: line * (GLYPH_H * px + LINE_GAP) }],
    };
  });

  return (
    <BubbleFrame
      tail={tail}
      text={text}
      onPress={
        animate
          ? () => {
              cancelAnimation(shown);
              shown.set(total);
            }
          : undefined
      }>
      {lines.map((line, i) => (
        <RevealLine key={i} text={line} start={starts[i] ?? 0} shown={shown} px={px} />
      ))}
      {typing && (
        <Animated.View
          pointerEvents="none"
          style={[styles.cursor, { width: GLYPH_W * px, height: GLYPH_H * px }, cursorStyle]}
        />
      )}
    </BubbleFrame>
  );
}

interface RevealLineProps {
  readonly text: string;
  readonly start: number;
  readonly shown: SharedValue<number>;
  readonly px: number;
}

function RevealLine({ text, start, shown, px }: RevealLineProps) {
  const clip = useAnimatedStyle(() => {
    const n = Math.min(text.length, Math.max(0, Math.floor(shown.value) - start));
    return { width: n * ADVANCE * px };
  });
  return (
    <Animated.View style={[styles.line, clip]}>
      <PixelText text={text} px={px} color="paper" decorative />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'flex-start' },
  box: { padding: A },
  face: { paddingVertical: 4 * A, paddingHorizontal: 5 * A, gap: LINE_GAP },
  line: { overflow: 'hidden' },
  // Sits one font px past the last revealed glyph; the face padding is its origin.
  cursor: { position: 'absolute', top: 4 * A, left: 5 * A, backgroundColor: palette.glow },
  // Tails are a night block with a dusk notch that runs into the bubble's face, covering its outline there.
  tailLeft: {
    position: 'absolute',
    left: -5 * A,
    bottom: 5 * A,
    width: 6 * A,
    height: 6 * A,
    backgroundColor: palette.night,
  },
  tailLeftFace: { position: 'absolute', left: A, top: A, width: 5 * A, height: 4 * A, backgroundColor: palette.dusk },
  tailBottom: {
    position: 'absolute',
    left: 11 * A,
    bottom: -5 * A,
    width: 6 * A,
    height: 6 * A,
    backgroundColor: palette.night,
  },
  tailBottomFace: { position: 'absolute', left: A, top: 0, width: 4 * A, height: 5 * A, backgroundColor: palette.dusk },
});
